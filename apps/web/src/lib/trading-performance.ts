import { getRedisClient } from './redis';
import {
  calculateTradingTelemetryMetrics,
  fetchBalanceEquityPoints,
  getMongoClient,
  getUtcDayKey,
  TRADING_ACCOUNT_SIZE,
  type BalanceEquityPoint,
  type TradingTelemetryMetrics,
} from './trading-telemetry';

const CACHE_TTL_SECONDS = 300;
const TRADES_CACHE_TTL_SECONDS = 300;
export const MAX_SERIES_POINTS = 1500;
const SHORT_TRADE_SECONDS = 5 * 60;

export type PerformanceSeriesPoint = { t: number; balance: number; equity: number };

export type PerformanceDay = {
  /** UTC calendar day, YYYY-MM-DD */
  date: string;
  /** Largest intraday drop from the day's first balance/equity, % of account size */
  drawdown: number;
  /** Closing balance change vs the day's first balance, % of account size */
  profit: number;
  /** Balance changed during the day (a trade was closed) */
  traded: boolean;
};

export type TradingPerformance = {
  metrics: TradingTelemetryMetrics;
  series: PerformanceSeriesPoint[];
  days: PerformanceDay[];
};

export type TradeHistoryRow = {
  position_id: number | string;
  symbol: string;
  volume: number | null;
  price_open: number | null;
  price_close: number | null;
  time_open: string | null;
  time_close: string | null;
  duration_minutes: number | null;
  comment: string;
  short_trade: boolean;
};

export type TradeHistoryPage = {
  trades: TradeHistoryRow[];
  total: number;
  page: number;
  page_size: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function usablePoints(points: BalanceEquityPoint[]) {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.timestamp) &&
        Number.isFinite(point.balance) &&
        Number.isFinite(point.equity)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Keep each bucket's lowest and highest equity point so spikes and dips survive downsampling. */
export function downsampleSeries(
  points: BalanceEquityPoint[],
  maxPoints = MAX_SERIES_POINTS
): PerformanceSeriesPoint[] {
  const toPoint = (p: BalanceEquityPoint) => ({
    t: p.timestamp,
    balance: round2(p.balance),
    equity: round2(p.equity),
  });
  if (points.length <= maxPoints) return points.map(toPoint);

  const bucketSize = Math.ceil(points.length / Math.floor(maxPoints / 2));
  const out: BalanceEquityPoint[] = [];
  for (let start = 0; start < points.length; start += bucketSize) {
    const bucket = points.slice(start, start + bucketSize);
    let low = bucket[0] as BalanceEquityPoint;
    let high = low;
    for (const point of bucket) {
      if (point.equity < low.equity) low = point;
      if (point.equity > high.equity) high = point;
    }
    if (low === high) out.push(low);
    else out.push(...(low.timestamp < high.timestamp ? [low, high] : [high, low]));
  }
  const last = points[points.length - 1] as BalanceEquityPoint;
  if (out[out.length - 1] !== last) out.push(last);
  return out.map(toPoint);
}

/** Same day buckets and formulas as calculateTradingTelemetryMetrics, kept per day. */
export function calculatePerformanceDays(points: BalanceEquityPoint[]): PerformanceDay[] {
  const buckets = new Map<string, BalanceEquityPoint[]>();
  for (const point of usablePoints(points)) {
    const day = getUtcDayKey(point.timestamp);
    const bucket = buckets.get(day) ?? [];
    bucket.push(point);
    buckets.set(day, bucket);
  }

  return [...buckets.entries()].map(([date, bucket]) => {
    const first = bucket[0] as BalanceEquityPoint;
    const last = bucket[bucket.length - 1] as BalanceEquityPoint;
    let lowBalance = first.balance;
    let lowEquity = first.equity;
    let traded = false;
    for (const point of bucket) {
      lowBalance = Math.min(lowBalance, point.balance);
      lowEquity = Math.min(lowEquity, point.equity);
      traded ||= point.balance !== first.balance;
    }
    const drawdown = Math.max(
      ((first.balance - lowBalance) / TRADING_ACCOUNT_SIZE) * 100,
      ((first.equity - lowEquity) / TRADING_ACCOUNT_SIZE) * 100,
      0
    );
    return {
      date,
      drawdown: round2(drawdown),
      profit: round2(((last.balance - first.balance) / TRADING_ACCOUNT_SIZE) * 100),
      traded,
    };
  });
}

export function calculateTradingPerformance(
  points: BalanceEquityPoint[]
): TradingPerformance | null {
  const ordered = usablePoints(points);
  const metrics = calculateTradingTelemetryMetrics(ordered);
  if (!metrics) return null;
  return {
    metrics,
    series: downsampleSeries(ordered),
    days: calculatePerformanceDays(ordered),
  };
}

async function withCache<T>(key: string, ttl: number, load: () => Promise<T | null>) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (err) {
      console.error('[redis] cache read error', err);
    }
  }

  const value = await load();

  if (redis && value) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      console.error('[redis] cache write error', err);
    }
  }
  return value;
}

export async function getTradingPerformance(accountNumber: number) {
  if (!Number.isFinite(accountNumber) || accountNumber <= 0) return null;
  return withCache(`performance:${accountNumber}`, CACHE_TTL_SECONDS, async () => {
    const points = await fetchBalanceEquityPoints(accountNumber);
    return points ? calculateTradingPerformance(points) : null;
  });
}

type ReportDoc = {
  position_id?: number | string;
  symbol?: string;
  volume_initial?: number;
  price_open?: number;
  price_current?: number;
  time_open?: Date | string | null;
  time_close?: Date | string | null;
  time_difference?: number | null;
  comment?: string | null;
  less_than_5_minutes?: boolean | null;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapReportDoc(doc: ReportDoc): TradeHistoryRow {
  const seconds = toNumber(doc.time_difference);
  return {
    position_id: doc.position_id ?? '',
    symbol: doc.symbol ?? '',
    volume: toNumber(doc.volume_initial),
    price_open: toNumber(doc.price_open),
    price_close: toNumber(doc.price_current),
    time_open: toIso(doc.time_open),
    time_close: toIso(doc.time_close),
    duration_minutes: seconds == null ? null : round2(seconds / 60),
    comment: doc.comment ?? '',
    short_trade:
      typeof doc.less_than_5_minutes === 'boolean'
        ? doc.less_than_5_minutes
        : seconds != null && seconds < SHORT_TRADE_SECONDS,
  };
}

/** Closed MT5 positions written to mt5_report7.<login> by the FT9ja report collector. */
export async function getTradeHistory(
  accountNumber: number,
  options: { page: number; pageSize: number; shortTrade?: boolean }
): Promise<TradeHistoryPage | null> {
  if (!Number.isFinite(accountNumber) || accountNumber <= 0) return null;
  const { page, pageSize, shortTrade } = options;
  const filterKey = shortTrade === undefined ? 'all' : shortTrade ? 'short' : 'long';

  return withCache(
    `trades:${accountNumber}:${filterKey}:${page}:${pageSize}`,
    TRADES_CACHE_TTL_SECONDS,
    async () => {
      const clientPromise = getMongoClient();
      if (!clientPromise) return null;
      const client = await clientPromise;
      const collection = client.db('mt5_report7').collection<ReportDoc>(String(accountNumber));
      const filter = shortTrade === undefined ? {} : { less_than_5_minutes: shortTrade };

      const [total, docs] = await Promise.all([
        collection.countDocuments(filter),
        collection
          .find(filter, {
            projection: {
              _id: 0,
              position_id: 1,
              symbol: 1,
              volume_initial: 1,
              price_open: 1,
              price_current: 1,
              time_open: 1,
              time_close: 1,
              time_difference: 1,
              comment: 1,
              less_than_5_minutes: 1,
            },
          })
          .sort({ time_open: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
      ]);

      return { trades: docs.map(mapReportDoc), total, page, page_size: pageSize };
    }
  );
}
