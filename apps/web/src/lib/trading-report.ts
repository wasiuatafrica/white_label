import { getRedisClient } from './redis';
import { getMongoClient } from './trading-telemetry';

const CACHE_TTL_SECONDS = 900;
const RAPID_MS = 5 * 60 * 1000;

export type OrderAction = 'BUY' | 'SELL' | 'CLOSE_BY' | 'UNKNOWN';

export type RawOrderDoc = {
  ticket?: number | string;
  position_id?: number | string | null;
  symbol?: string;
  volume_initial?: number;
  trade_type?: string | null;
  type?: number | string | null;
  time_setup?: number | null;
  time_setup_datetime?: string | Date | null;
};

export type ReportTicket = {
  ticket: string;
  /** Order setup time, ISO (UTC). */
  time: string | null;
  action: OrderAction;
  volume: number | null;
  /** Milliseconds since the previous ticket in this position; null for the first. */
  diff_ms: number | null;
  rapid: boolean;
};

export type ReportPosition = {
  position_id: string;
  symbol: string;
  entry_time: string | null;
  ticket_count: number;
  has_rapid: boolean;
  tickets: ReportTicket[];
};

export type TradeReport = {
  total_tickets: number;
  total_positions: number;
  closed_positions: number;
  scaling_positions: number;
  rapid_positions: number;
  symbols: { name: string; count: number }[];
  orders_per_position: { orders: string; count: number }[];
  /** Newest first. */
  positions: ReportPosition[];
};

/** Same mapping as the FT9ja report: BUY_LIMIT/BUY_STOP count as BUY, etc. */
export function normalizeOrderAction(doc: RawOrderDoc): OrderAction {
  const label = String(doc.trade_type ?? '').toUpperCase();
  if (label.includes('CLOSE')) return 'CLOSE_BY';
  if (label.includes('BUY') || label.includes('LONG')) return 'BUY';
  if (label.includes('SELL') || label.includes('SHORT')) return 'SELL';
  const code = Number(doc.type);
  if (code === 0 || code === 2 || code === 4 || code === 6) return 'BUY';
  if (code === 1 || code === 3 || code === 5 || code === 7) return 'SELL';
  if (code === 8) return 'CLOSE_BY';
  return 'UNKNOWN';
}

function orderTimeMs(doc: RawOrderDoc) {
  // time_setup is a unix timestamp in seconds (UTC); the *_datetime string has no zone.
  const seconds = Number(doc.time_setup);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  if (doc.time_setup_datetime instanceof Date) return doc.time_setup_datetime.getTime();
  if (typeof doc.time_setup_datetime === 'string') {
    const value = doc.time_setup_datetime;
    const parsed = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Groups raw MT5 orders (mt5_report_raw) into positions, like the FT9ja "MT5 Trade
 * Analyzer": orders without a position id are skipped, and an action less than 5 minutes
 * after the previous one in the same position is "rapid".
 */
export function buildTradeReport(orders: RawOrderDoc[]): TradeReport {
  const byPosition = new Map<string, { symbol: string; orders: RawOrderDoc[] }>();
  for (const order of orders) {
    if (!order.position_id) continue;
    const key = String(order.position_id);
    const group = byPosition.get(key) ?? { symbol: order.symbol ?? '', orders: [] };
    group.orders.push(order);
    byPosition.set(key, group);
  }

  const positions: ReportPosition[] = [];
  for (const [positionId, group] of byPosition) {
    const sorted = group.orders
      .map((order) => ({ order, time: orderTimeMs(order) }))
      .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

    let previous: number | null = null;
    const tickets = sorted.map(({ order, time }, index) => {
      const diff = index > 0 && time != null && previous != null ? time - previous : null;
      if (time != null) previous = time;
      const volume = Number(order.volume_initial);
      return {
        ticket: String(order.ticket ?? ''),
        time: time == null ? null : new Date(time).toISOString(),
        action: normalizeOrderAction(order),
        volume: Number.isFinite(volume) ? volume : null,
        diff_ms: diff,
        rapid: diff != null && diff < RAPID_MS,
      } satisfies ReportTicket;
    });

    positions.push({
      position_id: positionId,
      symbol: group.symbol,
      entry_time: tickets[0]?.time ?? null,
      ticket_count: tickets.length,
      has_rapid: tickets.some((t) => t.rapid),
      tickets,
    });
  }

  positions.sort((a, b) => (b.entry_time ?? '').localeCompare(a.entry_time ?? ''));

  const symbolCounts = new Map<string, number>();
  const orderCounts = new Map<string, number>();
  for (const position of positions) {
    symbolCounts.set(position.symbol, (symbolCounts.get(position.symbol) ?? 0) + 1);
    const bucket = position.ticket_count >= 6 ? '6+' : String(position.ticket_count);
    orderCounts.set(bucket, (orderCounts.get(bucket) ?? 0) + 1);
  }

  return {
    total_tickets: orders.length,
    total_positions: positions.length,
    closed_positions: positions.filter((p) => p.ticket_count > 1).length,
    scaling_positions: positions.filter((p) => p.ticket_count >= 3).length,
    rapid_positions: positions.filter((p) => p.has_rapid).length,
    symbols: [...symbolCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    orders_per_position: [...orderCounts]
      .map(([orders, count]) => ({ orders, count }))
      .sort((a, b) =>
        a.orders === '6+' ? 1 : b.orders === '6+' ? -1 : Number(a.orders) - Number(b.orders),
      ),
    positions,
  };
}

export async function getTradeReport(accountNumber: number): Promise<TradeReport | null> {
  if (!Number.isFinite(accountNumber) || accountNumber <= 0) return null;

  const cacheKey = `trade-report:${accountNumber}`;
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as TradeReport;
    } catch (err) {
      console.error('[redis] cache read error', err);
    }
  }

  const clientPromise = getMongoClient();
  if (!clientPromise) return null;
  const client = await clientPromise;
  const orders = await client
    .db('mt5_report_raw')
    .collection<RawOrderDoc>(String(accountNumber))
    .find(
      {},
      {
        projection: {
          _id: 0,
          ticket: 1,
          position_id: 1,
          symbol: 1,
          volume_initial: 1,
          trade_type: 1,
          type: 1,
          time_setup: 1,
          time_setup_datetime: 1,
        },
      },
    )
    .toArray();

  const report = buildTradeReport(orders);

  if (redis && orders.length > 0) {
    try {
      await redis.set(cacheKey, JSON.stringify(report), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      console.error('[redis] cache write error', err);
    }
  }
  return report;
}
