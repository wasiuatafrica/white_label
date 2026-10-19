import { describe, expect, it } from 'vitest';
import {
  calculatePerformanceDays,
  calculateTradingPerformance,
  downsampleSeries,
  mapReportDoc,
} from './trading-performance';
import type { BalanceEquityPoint } from './trading-telemetry';

const points: BalanceEquityPoint[] = [
  { account: 41121589, timestamp: 1781568000, balance: 10000, equity: 10000 },
  { account: 41121589, timestamp: 1781571600, balance: 9900, equity: 9400 },
  { account: 41121589, timestamp: 1781654400, balance: 10600, equity: 10500 },
  { account: 41121589, timestamp: 1781658000, balance: 10400, equity: 10300 },
  { account: 41121589, timestamp: 1781740800, balance: 12400, equity: 12350 },
  { account: 41121589, timestamp: 1781827200, balance: 12500, equity: 12450 },
];

describe('calculatePerformanceDays', () => {
  it('groups by UTC day with drawdown and closed P&L as % of account size', () => {
    expect(calculatePerformanceDays(points)).toEqual([
      { date: '2026-06-16', drawdown: 6, profit: -1, traded: true },
      { date: '2026-06-17', drawdown: 2, profit: -2, traded: true },
      { date: '2026-06-18', drawdown: 0, profit: 0, traded: false },
      { date: '2026-06-19', drawdown: 0, profit: 0, traded: false },
    ]);
  });

  it('agrees with the telemetry summary', () => {
    const performance = calculateTradingPerformance(points);
    const days = performance?.days ?? [];
    expect(performance?.metrics.trading_days).toBe(days.filter((d) => d.traded).length);
    expect(performance?.metrics.daily_drawdown).toBe(Math.max(...days.map((d) => d.drawdown)));
  });

  it('returns null without usable points', () => {
    expect(calculateTradingPerformance([])).toBeNull();
  });
});

describe('downsampleSeries', () => {
  it('keeps every point under the limit', () => {
    expect(downsampleSeries(points, 10)).toHaveLength(points.length);
  });

  it('caps the series and keeps extremes and the latest point', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      account: 1,
      timestamp: i * 60,
      balance: 10000,
      equity: i === 500 ? 9000 : 10000 + (i % 7),
    }));
    const series = downsampleSeries(many, 100);
    expect(series.length).toBeLessThanOrEqual(101);
    expect(series.some((p) => p.equity === 9000)).toBe(true);
    expect(series[series.length - 1]?.t).toBe(999 * 60);
  });
});

describe('mapReportDoc', () => {
  it('converts duration seconds to minutes and keeps the short-trade flag', () => {
    expect(
      mapReportDoc({
        position_id: 123,
        symbol: 'EURUSD',
        volume_initial: 0.5,
        price_open: 1.1,
        price_current: 1.2,
        time_open: new Date('2026-06-16T10:00:00Z'),
        time_close: new Date('2026-06-16T10:03:00Z'),
        time_difference: 180,
        comment: '',
        less_than_5_minutes: true,
      })
    ).toEqual({
      position_id: 123,
      symbol: 'EURUSD',
      volume: 0.5,
      price_open: 1.1,
      price_close: 1.2,
      time_open: '2026-06-16T10:00:00.000Z',
      time_close: '2026-06-16T10:03:00.000Z',
      duration_minutes: 3,
      comment: '',
      short_trade: true,
    });
  });
});
