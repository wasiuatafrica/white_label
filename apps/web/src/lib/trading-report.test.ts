import { describe, expect, it } from 'vitest';
import { buildTradeReport, normalizeOrderAction } from './trading-report';

const t0 = Date.UTC(2026, 9, 12, 9, 0, 0) / 1000;

describe('buildTradeReport', () => {
  const report = buildTradeReport([
    {
      ticket: 1,
      position_id: 100,
      symbol: 'EURUSD',
      volume_initial: 1,
      trade_type: 'BUY',
      time_setup: t0,
    },
    {
      ticket: 2,
      position_id: 100,
      symbol: 'EURUSD',
      volume_initial: 1,
      trade_type: 'SELL',
      time_setup: t0 + 120,
    },
    {
      ticket: 3,
      position_id: 200,
      symbol: 'XAUUSD',
      volume_initial: 0.5,
      trade_type: 'SELL',
      time_setup: t0 + 3600,
    },
    {
      ticket: 4,
      position_id: 200,
      symbol: 'XAUUSD',
      volume_initial: 0.5,
      trade_type: 'SELL_LIMIT',
      time_setup: t0 + 7200,
    },
    {
      ticket: 5,
      position_id: 200,
      symbol: 'XAUUSD',
      volume_initial: 1,
      type: 0,
      time_setup: t0 + 9000,
    },
    {
      ticket: 6,
      position_id: 300,
      symbol: 'EURUSD',
      volume_initial: 1,
      trade_type: 'BUY',
      time_setup: t0 + 10000,
    },
    {
      ticket: 7,
      position_id: 0,
      symbol: 'EURUSD',
      volume_initial: 1,
      trade_type: 'BUY_LIMIT',
      time_setup: t0,
    },
  ]);

  it('counts tickets, positions, scaling and rapid positions', () => {
    expect(report).toMatchObject({
      total_tickets: 7,
      total_positions: 3,
      closed_positions: 2,
      scaling_positions: 1,
      rapid_positions: 1,
    });
  });

  it('builds symbol and orders-per-position distributions', () => {
    expect(report.symbols).toEqual([
      { name: 'EURUSD', count: 2 },
      { name: 'XAUUSD', count: 1 },
    ]);
    expect(report.orders_per_position).toEqual([
      { orders: '1', count: 1 },
      { orders: '2', count: 1 },
      { orders: '3', count: 1 },
    ]);
  });

  it('orders positions newest first with a ticket sequence', () => {
    expect(report.positions.map((p) => p.position_id)).toEqual(['300', '200', '100']);
    const first = report.positions[2]!;
    expect(first.tickets.map((t) => [t.action, t.diff_ms, t.rapid])).toEqual([
      ['BUY', null, false],
      ['SELL', 120_000, true],
    ]);
    expect(first.entry_time).toBe('2026-10-12T09:00:00.000Z');
  });
});

describe('normalizeOrderAction', () => {
  it('maps MT5 order types', () => {
    expect(normalizeOrderAction({ trade_type: 'BUY_STOP' })).toBe('BUY');
    expect(normalizeOrderAction({ trade_type: 'CLOSE_BY' })).toBe('CLOSE_BY');
    expect(normalizeOrderAction({ type: 5 })).toBe('SELL');
    expect(normalizeOrderAction({})).toBe('UNKNOWN');
  });
});
