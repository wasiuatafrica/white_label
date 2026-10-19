import { describe, expect, it } from 'vitest';
import { calculateOneSidedBetting, countShortTradesSince } from './trading-rules';

const DAY = 86400;
const start = Date.UTC(2026, 9, 5) / 1000; // Mon 5 Oct 2026, 00:00 UTC

function closes(balances: number[]) {
  // One point at the start and one at the end of each day.
  return balances.flatMap((balance, i) => [
    { timestamp: start + i * DAY + 60, balance: i === 0 ? 10000 : balances[i - 1]! },
    { timestamp: start + i * DAY + DAY - 60, balance },
  ]);
}

describe('calculateOneSidedBetting', () => {
  it('passes when no single day makes more than 50% of net period profit', () => {
    const result = calculateOneSidedBetting(closes([10200, 10400, 10600]));
    expect(result).toMatchObject({
      checked: true,
      status: 'ok',
      total_profit: 600,
      best_day: '2026-10-05',
      best_day_profit: 200,
      best_day_share: 33.33,
      passed: true,
    });
  });

  it('flags a day above 50% of net profit, counting losing days against the total', () => {
    // +800, -300, +100 → net 600, best day 800 = 133%
    const result = calculateOneSidedBetting(closes([10800, 10500, 10600]));
    expect(result).toMatchObject({
      status: 'violated',
      total_profit: 600,
      best_day: '2026-10-05',
      best_day_profit: 800,
      best_day_share: 133.33,
      passed: false,
    });
  });

  it('treats exactly 50% as compliant', () => {
    const result = calculateOneSidedBetting(closes([10300, 10600]));
    expect(result.best_day_share).toBe(50);
    expect(result.passed).toBe(true);
  });

  it('reports no profit (and no violation) when the period is flat or losing', () => {
    const result = calculateOneSidedBetting(closes([10300, 9900]));
    expect(result).toMatchObject({ checked: true, status: 'no_profit', total_profit: -100, passed: true });
  });

  it('measures the first day from the balance before the payout period started', () => {
    const points = [
      { timestamp: start + 3600, balance: 10500 },
      { timestamp: start + DAY + 3600, balance: 10700 },
    ];
    const result = calculateOneSidedBetting(points, 10000);
    // Day 1: +500 from the 10,000 opening balance, day 2: +200 → net 700, 71%
    expect(result).toMatchObject({ total_profit: 700, best_day_profit: 500, passed: false });
  });

  it('is unchecked without data', () => {
    expect(calculateOneSidedBetting([])).toMatchObject({ checked: false, passed: true });
  });
});

describe('countShortTradesSince', () => {
  const trades = [
    { time_close: new Date('2026-10-01T10:00:00Z') },
    { time_close: '2026-10-10T10:00:00Z' },
    { time_close: new Date('2026-10-12T10:00:00Z') },
  ];

  it('counts the full history when there has been no payout', () => {
    expect(countShortTradesSince(trades, null)).toBe(3);
  });

  it('counts only trades closed since the last approved payout', () => {
    expect(countShortTradesSince(trades, new Date('2026-10-05T00:00:00Z'))).toBe(2);
  });
});
