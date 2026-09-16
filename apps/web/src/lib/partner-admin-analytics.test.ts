import { describe, expect, it } from 'vitest';
import { getMonthlyChartItemKey } from '@/lib/partner-admin-analytics';

describe('getMonthlyChartItemKey', () => {
  it('keeps placeholder month items uniquely keyed', () => {
    const keys = Array.from({ length: 6 }, (_, index) => getMonthlyChartItemKey('', index));

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('preserves real month keys', () => {
    expect(getMonthlyChartItemKey('2026-09', 0)).toBe('2026-09');
  });
});
