import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/queries/trade-accounts', () => ({
  listMonitoredTradeAccounts: vi.fn(),
  markTradeAccountBlown: vi.fn(),
  markTradeAccountInactive: vi.fn(),
}));

vi.mock('./trading-telemetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./trading-telemetry')>()),
  getMongoClient: vi.fn(() => Promise.resolve({})),
  fetchAccountLows: vi.fn(),
  fetchDailyOpenAndLows: vi.fn(),
  fetchLastActivityTimestamp: vi.fn(),
}));

import {
  listMonitoredTradeAccounts,
  markTradeAccountBlown,
  markTradeAccountInactive,
} from '@/db/queries/trade-accounts';
import { getUtcDayStart, getWorstDailyDrawdown, isInactiveSince, runAccountCheck } from './account-checks';
import {
  fetchAccountLows,
  fetchDailyOpenAndLows,
  fetchLastActivityTimestamp,
} from './trading-telemetry';

const NOW = new Date('2026-10-20T21:50:00Z');
const NOW_SECONDS = NOW.getTime() / 1000;
const DAY = 86_400;

function day(firstBalance: number, firstEquity: number, lowestBalance: number, lowestEquity: number) {
  return { dayStart: 0, firstBalance, firstEquity, lowestBalance, lowestEquity };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listMonitoredTradeAccounts).mockResolvedValue([
    { id: 1, number: 1001 },
    { id: 2, number: 1002 },
  ]);
  vi.mocked(markTradeAccountBlown).mockResolvedValue(true);
  vi.mocked(markTradeAccountInactive).mockResolvedValue(true);
});

describe('account check helpers', () => {
  it('uses the worst day and measures drawdown against the account size', () => {
    expect(getWorstDailyDrawdown([])).toBeNull();
    expect(getWorstDailyDrawdown([day(10500, 10500, 10100, 10000), day(10000, 10000, 9800, 9900)])).toBe(5);
  });

  it('treats 14 full days without a balance/equity change as inactive', () => {
    expect(isInactiveSince(null, NOW_SECONDS)).toBe(false);
    expect(isInactiveSince(NOW_SECONDS - 14 * DAY, NOW_SECONDS)).toBe(true);
    expect(isInactiveSince(NOW_SECONDS - 14 * DAY + 60, NOW_SECONDS)).toBe(false);
  });
});

describe('runAccountCheck', () => {
  it('blows accounts at or past the 10% account drawdown limit', async () => {
    vi.mocked(fetchAccountLows).mockImplementation(async (number) =>
      number === 1001
        ? { lowestBalance: 9500, lowestEquity: 9000 }
        : { lowestBalance: 9500, lowestEquity: 9010 }
    );

    const summary = await runAccountCheck('account_drawdown', { now: NOW });

    expect(markTradeAccountBlown).toHaveBeenCalledTimes(1);
    expect(markTradeAccountBlown).toHaveBeenCalledWith(1, 'account_drawdown', 10);
    expect(summary).toMatchObject({ checked: 2, errors: 0, flagged: [{ number: 1001, value: 10 }] });
  });

  it('checks yesterday and today for daily drawdown and keeps going after a failing account', async () => {
    vi.mocked(fetchDailyOpenAndLows).mockImplementation(async (number) => {
      if (number === 1001) throw new Error('mongo down');
      return [day(10000, 10000, 9480, 9600)];
    });

    const summary = await runAccountCheck('daily_drawdown', { now: NOW });

    expect(fetchDailyOpenAndLows).toHaveBeenCalledWith(1002, getUtcDayStart(NOW_SECONDS) - DAY);
    expect(markTradeAccountBlown).toHaveBeenCalledWith(2, 'daily_drawdown', 5.2);
    expect(summary).toMatchObject({
      checked: 2,
      errors: 1,
      flagged: [{ number: 1002 }],
      failures: [{ number: 1001, message: 'mongo down' }],
    });
  });

  it('does not report accounts another run already blew', async () => {
    vi.mocked(fetchAccountLows).mockResolvedValue({ lowestBalance: 8000, lowestEquity: 8000 });
    vi.mocked(markTradeAccountBlown).mockResolvedValue(false);

    const summary = await runAccountCheck('account_drawdown', { now: NOW });

    expect(summary.flagged).toEqual([]);
  });

  it('marks accounts inactive after 14 days and skips accounts with no ticks', async () => {
    vi.mocked(fetchLastActivityTimestamp).mockImplementation(async (number) =>
      number === 1001 ? NOW_SECONDS - 20 * DAY : null
    );

    const summary = await runAccountCheck('inactivity', { now: NOW });

    expect(markTradeAccountInactive).toHaveBeenCalledTimes(1);
    expect(markTradeAccountInactive).toHaveBeenCalledWith(1);
    expect(summary.flagged).toEqual([{ trade_account_id: 1, number: 1001, value: 20 }]);
  });
});
