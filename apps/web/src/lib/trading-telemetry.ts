import { MongoClient } from 'mongodb';
import { getRedisClient } from './redis';

const CACHE_TTL_SECONDS = 300;
const DAY_SECONDS = 86_400;

export const TRADING_ACCOUNT_SIZE = 10000;
export const TRADING_PROFIT_TARGET_PERCENT = 25;
export const TRADING_PROFIT_TARGET_BALANCE =
  TRADING_ACCOUNT_SIZE * (1 + TRADING_PROFIT_TARGET_PERCENT / 100);
export const TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT = 5;
export const TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT = 10;
export const TRADING_REQUIRED_DAYS = 10;

export function getProfitTargetPercent(evalType: 'SS' | 'SSL') {
  return evalType === 'SSL' ? 0 : TRADING_PROFIT_TARGET_PERCENT;
}

export type BalanceEquityPoint = {
  account: number;
  timestamp: number;
  balance: number;
  equity: number;
};

export type TradingTelemetryMetrics = {
  has_telemetry: boolean;
  latest_balance: number | null;
  latest_equity: number | null;
  current_profit: number;
  profit_target: number;
  trading_days: number;
  required_days: number;
  daily_drawdown: number;
  max_daily_drawdown: number;
  account_drawdown: number;
  max_account_drawdown: number;
  profit_target_passed: boolean;
  min_trading_days_passed: boolean;
  daily_drawdown_breached: boolean;
  account_drawdown_breached: boolean;
};

let mongoClientPromise: Promise<MongoClient> | null = null;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

export function getMongoClient() {
  const url = process.env.MONGODB_URL;
  if (!url) return null;

  mongoClientPromise ??= new MongoClient(url).connect().catch((error) => {
    // Don't cache a failed connection; the next call retries.
    mongoClientPromise = null;
    throw error;
  });
  return mongoClientPromise;
}

export function getUtcDayKey(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

/** Largest drop below the starting account size, % of account size (unrounded). */
export function calculateAccountDrawdownPercent(lowestBalance: number, lowestEquity: number) {
  const lowest = Math.min(TRADING_ACCOUNT_SIZE, lowestBalance, lowestEquity);
  return ((TRADING_ACCOUNT_SIZE - lowest) / TRADING_ACCOUNT_SIZE) * 100;
}

/** Largest intraday drop from the day's first balance/equity, % of account size (unrounded). */
export function calculateDailyDrawdownPercent(day: {
  firstBalance: number;
  firstEquity: number;
  lowestBalance: number;
  lowestEquity: number;
}) {
  return Math.max(
    ((day.firstBalance - day.lowestBalance) / TRADING_ACCOUNT_SIZE) * 100,
    ((day.firstEquity - day.lowestEquity) / TRADING_ACCOUNT_SIZE) * 100,
    0
  );
}

export function calculateTradingTelemetryMetrics(
  points: BalanceEquityPoint[]
): TradingTelemetryMetrics | null {
  const ordered = points
    .filter(
      (point) =>
        Number.isFinite(point.timestamp) &&
        Number.isFinite(point.balance) &&
        Number.isFinite(point.equity)
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (ordered.length === 0) return null;

  const latest = ordered[ordered.length - 1] as BalanceEquityPoint;
  const dailyBuckets = new Map<string, BalanceEquityPoint[]>();
  let lowestBalance = TRADING_ACCOUNT_SIZE;
  let lowestEquity = TRADING_ACCOUNT_SIZE;

  for (const point of ordered) {
    lowestBalance = Math.min(lowestBalance, point.balance);
    lowestEquity = Math.min(lowestEquity, point.equity);

    const day = getUtcDayKey(point.timestamp);
    const bucket = dailyBuckets.get(day) ?? [];
    bucket.push(point);
    dailyBuckets.set(day, bucket);
  }

  let maxDailyDrawdown = 0;
  let tradingDays = 0;

  for (const bucket of dailyBuckets.values()) {
    const first = bucket[0] as BalanceEquityPoint;
    let dayLowestBalance = first.balance;
    let dayLowestEquity = first.equity;
    let balanceChanged = false;

    for (const point of bucket) {
      dayLowestBalance = Math.min(dayLowestBalance, point.balance);
      dayLowestEquity = Math.min(dayLowestEquity, point.equity);
      balanceChanged ||= point.balance !== first.balance;
    }

    maxDailyDrawdown = Math.max(
      maxDailyDrawdown,
      calculateDailyDrawdownPercent({
        firstBalance: first.balance,
        firstEquity: first.equity,
        lowestBalance: dayLowestBalance,
        lowestEquity: dayLowestEquity,
      })
    );
    if (balanceChanged) tradingDays += 1;
  }

  const accountDrawdown = calculateAccountDrawdownPercent(lowestBalance, lowestEquity);
  const currentProfit = ((latest.balance - TRADING_ACCOUNT_SIZE) / TRADING_ACCOUNT_SIZE) * 100;

  return {
    has_telemetry: true,
    latest_balance: roundMoney(latest.balance),
    latest_equity: roundMoney(latest.equity),
    current_profit: roundPercent(currentProfit),
    profit_target: TRADING_PROFIT_TARGET_PERCENT,
    trading_days: tradingDays,
    required_days: TRADING_REQUIRED_DAYS,
    daily_drawdown: roundPercent(Math.max(maxDailyDrawdown, 0)),
    max_daily_drawdown: TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
    account_drawdown: roundPercent(Math.max(accountDrawdown, 0)),
    max_account_drawdown: TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
    profit_target_passed: latest.balance >= TRADING_PROFIT_TARGET_BALANCE,
    min_trading_days_passed: tradingDays >= TRADING_REQUIRED_DAYS,
    daily_drawdown_breached: maxDailyDrawdown >= TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
    account_drawdown_breached:
      accountDrawdown >= TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
  };
}

async function getAccountCollection(accountNumber: number) {
  const clientPromise = getMongoClient();
  if (!clientPromise) return null;

  const client = await clientPromise;
  return client.db('stocks').collection<BalanceEquityPoint>(String(accountNumber));
}

export async function fetchBalanceEquityPoints(accountNumber: number) {
  const collection = await getAccountCollection(accountNumber);
  if (!collection) return null;

  return collection
    .find(
      { account: accountNumber },
      {
        projection: {
          _id: 0,
          account: 1,
          timestamp: 1,
          balance: 1,
          equity: 1,
        },
      }
    )
    .sort({ timestamp: 1 })
    .toArray();
}

/** All-time lowest balance and equity, aggregated in MongoDB. */
export async function fetchAccountLows(accountNumber: number) {
  const collection = await getAccountCollection(accountNumber);
  if (!collection) return null;

  const [row] = await collection
    .aggregate<{ lowestBalance: number; lowestEquity: number }>([
      { $match: { account: accountNumber } },
      {
        $group: {
          _id: null,
          lowestBalance: { $min: '$balance' },
          lowestEquity: { $min: '$equity' },
        },
      },
    ])
    .toArray();
  return row ?? null;
}

export type DailyOpenAndLows = {
  dayStart: number;
  firstBalance: number;
  firstEquity: number;
  lowestBalance: number;
  lowestEquity: number;
};

/** First and lowest balance/equity per UTC day since `fromTimestamp`, aggregated in MongoDB. */
export async function fetchDailyOpenAndLows(accountNumber: number, fromTimestamp: number) {
  const collection = await getAccountCollection(accountNumber);
  if (!collection) return null;

  return collection
    .aggregate<DailyOpenAndLows>(
      [
        { $match: { account: accountNumber, timestamp: { $gte: fromTimestamp } } },
        { $sort: { timestamp: 1 } },
        {
          $group: {
            _id: { $subtract: ['$timestamp', { $mod: ['$timestamp', DAY_SECONDS] }] },
            firstBalance: { $first: '$balance' },
            firstEquity: { $first: '$equity' },
            lowestBalance: { $min: '$balance' },
            lowestEquity: { $min: '$equity' },
          },
        },
        { $project: { _id: 0, dayStart: '$_id', firstBalance: 1, firstEquity: 1, lowestBalance: 1, lowestEquity: 1 } },
      ],
      { allowDiskUse: true }
    )
    .toArray();
}

/**
 * Timestamp of the last balance/equity change: the first tick of the final run of
 * identical balance/equity values. Null when the account has no ticks.
 */
export async function fetchLastActivityTimestamp(accountNumber: number) {
  const collection = await getAccountCollection(accountNumber);
  if (!collection) return null;

  const projection = { _id: 0, timestamp: 1, balance: 1, equity: 1 } as const;
  const latest = await collection.findOne(
    { account: accountNumber },
    { projection, sort: { timestamp: -1 } }
  );
  if (!latest) return null;

  const lastDifferent = await collection.findOne(
    {
      account: accountNumber,
      $or: [{ balance: { $ne: latest.balance } }, { equity: { $ne: latest.equity } }],
    },
    { projection, sort: { timestamp: -1 } }
  );
  const runStart = await collection.findOne(
    lastDifferent
      ? { account: accountNumber, timestamp: { $gt: lastDifferent.timestamp } }
      : { account: accountNumber },
    { projection, sort: { timestamp: 1 } }
  );
  return runStart?.timestamp ?? latest.timestamp;
}

export async function getTradingTelemetryMetrics(accountNumber: number) {
  if (!Number.isFinite(accountNumber) || accountNumber <= 0) return null;

  const cacheKey = `telemetry:${accountNumber}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as TradingTelemetryMetrics;
    } catch (err) {
      console.error('[redis] cache read error', err);
    }
  }

  const points = await fetchBalanceEquityPoints(accountNumber);
  if (!points) return null;

  const metrics = calculateTradingTelemetryMetrics(points);

  if (redis && metrics) {
    try {
      await redis.set(cacheKey, JSON.stringify(metrics), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      console.error('[redis] cache write error', err);
    }
  }

  return metrics;
}
