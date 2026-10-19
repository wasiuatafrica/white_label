import { getRedisClient } from './redis';
import { getMongoClient, getUtcDayKey, type BalanceEquityPoint } from './trading-telemetry';

const CACHE_TTL_SECONDS = 300;
export const ONE_SIDED_BETTING_LIMIT_PERCENT = 50;

type BalancePoint = Pick<BalanceEquityPoint, 'timestamp' | 'balance'>;

export type ShortTradeCheck = {
  /** False until the trade report for this account has synced at least once. */
  checked: boolean;
  count: number;
  passed: boolean;
};

export type OneSidedBettingCheck = {
  checked: boolean;
  status: 'ok' | 'violated' | 'no_profit';
  /** Net balance change over the payout period, in account currency. */
  total_profit: number;
  /** UTC day with the largest closed profit, YYYY-MM-DD. */
  best_day: string | null;
  best_day_profit: number;
  /** best_day_profit as a % of total_profit; null when there is no period profit. */
  best_day_share: number | null;
  limit_percent: number;
  passed: boolean;
};

export type TradingRuleChecks = {
  /** Start of the current payout period (ISO); null means the full account history. */
  period_start: string | null;
  short_trades: ShortTradeCheck;
  one_sided_betting: OneSidedBettingCheck;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * One-sided betting: a single day cannot generate more than 50% of the total (net)
 * profit in a payout period. Daily profit is the change in closing balance from the
 * previous day's close (the period's opening balance for the first day), so only
 * closed trades count.
 */
export function calculateOneSidedBetting(
  periodPoints: BalancePoint[],
  openingBalance?: number
): OneSidedBettingCheck {
  const ordered = periodPoints
    .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.balance))
    .sort((a, b) => a.timestamp - b.timestamp);

  const empty: OneSidedBettingCheck = {
    checked: false,
    status: 'no_profit',
    total_profit: 0,
    best_day: null,
    best_day_profit: 0,
    best_day_share: null,
    limit_percent: ONE_SIDED_BETTING_LIMIT_PERCENT,
    passed: true,
  };
  if (ordered.length === 0) return empty;

  const opening = openingBalance ?? (ordered[0] as BalancePoint).balance;
  const closes = new Map<string, number>();
  for (const point of ordered) closes.set(getUtcDayKey(point.timestamp), point.balance);

  let previousClose = opening;
  let bestDay: string | null = null;
  let bestDayProfit = 0;
  for (const [day, close] of closes) {
    const profit = close - previousClose;
    if (bestDay === null || profit > bestDayProfit) {
      bestDay = day;
      bestDayProfit = profit;
    }
    previousClose = close;
  }

  const totalProfit = previousClose - opening;
  if (totalProfit <= 0) {
    return {
      ...empty,
      checked: true,
      total_profit: round2(totalProfit),
      best_day: bestDayProfit > 0 ? bestDay : null,
      best_day_profit: round2(Math.max(bestDayProfit, 0)),
    };
  }

  const share = (bestDayProfit / totalProfit) * 100;
  const passed = share <= ONE_SIDED_BETTING_LIMIT_PERCENT;
  return {
    checked: true,
    status: passed ? 'ok' : 'violated',
    total_profit: round2(totalProfit),
    best_day: bestDay,
    best_day_profit: round2(bestDayProfit),
    best_day_share: round2(share),
    limit_percent: ONE_SIDED_BETTING_LIMIT_PERCENT,
    passed,
  };
}

function toTime(value: unknown) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

export function countShortTradesSince(
  trades: { time_close?: unknown; time_open?: unknown }[],
  periodStart: Date | null
) {
  if (!periodStart) return trades.length;
  const start = periodStart.getTime();
  return trades.filter((t) => {
    const closedAt = toTime(t.time_close) ?? toTime(t.time_open);
    return closedAt == null || closedAt >= start;
  }).length;
}

async function loadRuleChecks(
  accountNumber: number,
  periodStart: Date | null
): Promise<TradingRuleChecks | null> {
  const clientPromise = getMongoClient();
  if (!clientPromise) return null;
  const client = await clientPromise;

  const stocks = client.db('stocks').collection<BalanceEquityPoint>(String(accountNumber));
  const reports = client
    .db('mt5_report7')
    .collection<{ time_open?: unknown; time_close?: unknown; less_than_5_minutes?: boolean }>(
      String(accountNumber)
    );
  const startSeconds = periodStart ? Math.floor(periodStart.getTime() / 1000) : null;
  const projection = { _id: 0, timestamp: 1, balance: 1 } as const;

  const [periodPoints, openingPoint, reportCount, shortTrades] = await Promise.all([
    stocks
      .find(
        startSeconds == null
          ? { account: accountNumber }
          : { account: accountNumber, timestamp: { $gte: startSeconds } },
        { projection }
      )
      .sort({ timestamp: 1 })
      .toArray(),
    startSeconds == null
      ? Promise.resolve(null)
      : stocks.findOne(
          { account: accountNumber, timestamp: { $lt: startSeconds } },
          { projection, sort: { timestamp: -1 } }
        ),
    reports.estimatedDocumentCount(),
    reports
      .find({ less_than_5_minutes: true }, { projection: { _id: 0, time_open: 1, time_close: 1 } })
      .toArray(),
  ]);

  const shortCount = countShortTradesSince(shortTrades, periodStart);
  return {
    period_start: periodStart ? periodStart.toISOString() : null,
    short_trades: {
      checked: reportCount > 0,
      count: shortCount,
      passed: shortCount === 0,
    },
    one_sided_betting: calculateOneSidedBetting(
      periodPoints as BalancePoint[],
      openingPoint?.balance
    ),
  };
}

/** 5-minute and one-sided betting checks for the current payout period (cached 5 min). */
export async function getTradingRuleChecks(accountNumber: number, periodStart: Date | null) {
  if (!Number.isFinite(accountNumber) || accountNumber <= 0) return null;

  const cacheKey = `rules:${accountNumber}:${periodStart ? periodStart.getTime() : 'all'}`;
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as TradingRuleChecks;
    } catch (err) {
      console.error('[redis] cache read error', err);
    }
  }

  const checks = await loadRuleChecks(accountNumber, periodStart);

  if (redis && checks) {
    try {
      await redis.set(cacheKey, JSON.stringify(checks), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      console.error('[redis] cache write error', err);
    }
  }
  return checks;
}
