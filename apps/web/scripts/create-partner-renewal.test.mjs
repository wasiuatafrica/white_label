import { describe, expect, it } from 'vitest';
import { buildFixtureDates } from './create-partner-renewal.mjs';

describe('buildFixtureDates', () => {
  it('creates a paid period ending 30 days before the fixture timestamp', () => {
    const now = new Date('2026-09-16T12:00:00.000Z');
    const dates = buildFixtureDates(now);

    expect(dates.periodStart.toISOString()).toBe('2026-07-18T12:00:00.000Z');
    expect(dates.periodEnd.toISOString()).toBe('2026-08-17T12:00:00.000Z');
    expect(dates.dueAt.toISOString()).toBe('2026-07-18T12:00:00.000Z');
  });
});
