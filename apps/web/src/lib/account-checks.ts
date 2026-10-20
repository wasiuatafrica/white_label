import {
  listMonitoredTradeAccounts,
  markTradeAccountBlown,
  markTradeAccountInactive,
} from '@/db/queries/trade-accounts';
import {
  calculateAccountDrawdownPercent,
  calculateDailyDrawdownPercent,
  fetchAccountLows,
  fetchDailyOpenAndLows,
  fetchLastActivityTimestamp,
  getMongoClient,
  TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
  TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
} from './trading-telemetry';

export const ACCOUNT_CHECKS = ['account_drawdown', 'daily_drawdown', 'inactivity'] as const;
export type AccountCheck = (typeof ACCOUNT_CHECKS)[number];

const DAY_SECONDS = 86_400;
const INACTIVITY_DAYS = 14;
const MONGO_CONCURRENCY = 10;

type MonitoredAccount = { id: number; number: number };

export type AccountCheckSummary = {
  check: AccountCheck;
  started_at: string;
  finished_at: string;
  checked: number;
  flagged: { trade_account_id: number; number: number; value: number }[];
  errors: number;
};

export function getUtcDayStart(nowSeconds: number) {
  return Math.floor(nowSeconds / DAY_SECONDS) * DAY_SECONDS;
}

/** Worst daily drawdown across the given days, or null when there are none. */
export function getWorstDailyDrawdown(
  days: Parameters<typeof calculateDailyDrawdownPercent>[0][]
) {
  if (days.length === 0) return null;
  return Math.max(...days.map(calculateDailyDrawdownPercent));
}

export function isInactiveSince(lastActivity: number | null, nowSeconds: number) {
  return lastActivity !== null && nowSeconds - lastActivity >= INACTIVITY_DAYS * DAY_SECONDS;
}

async function forEachAccount(
  accounts: MonitoredAccount[],
  check: (account: MonitoredAccount) => Promise<void>
) {
  let errors = 0;
  let next = 0;
  async function worker() {
    while (next < accounts.length) {
      const account = accounts[next++] as MonitoredAccount;
      try {
        await check(account);
      } catch (error) {
        errors += 1;
        console.error('[account-checks] account check failed', { number: account.number, error });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MONGO_CONCURRENCY, accounts.length) }, worker));
  return errors;
}

/**
 * Runs one check over every monitored trade account. Breaches set `blown`, 14 days without a
 * balance/equity change sets `inactive`.
 *
 * daily_drawdown covers yesterday and today (UTC days, as on the dashboard) so a breach in the
 * minutes after the evening run is caught the next evening. Pass `dailyFromTimestamp: 0` to
 * re-check every day on record.
 */
export async function runAccountCheck(
  check: AccountCheck,
  options: { now?: Date; dailyFromTimestamp?: number } = {}
): Promise<AccountCheckSummary> {
  if (!getMongoClient()) throw new Error('MONGODB_URL is not configured');

  const now = options.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const dailyFrom = options.dailyFromTimestamp ?? getUtcDayStart(nowSeconds) - DAY_SECONDS;
  const accounts = await listMonitoredTradeAccounts();
  const flagged: AccountCheckSummary['flagged'] = [];

  const errors = await forEachAccount(accounts, async (account) => {
    if (check === 'account_drawdown') {
      const lows = await fetchAccountLows(account.number);
      if (!lows) return;
      const drawdown = calculateAccountDrawdownPercent(lows.lowestBalance, lows.lowestEquity);
      if (
        drawdown >= TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT &&
        (await markTradeAccountBlown(account.id, 'account_drawdown', drawdown))
      ) {
        flagged.push({ trade_account_id: account.id, number: account.number, value: drawdown });
      }
    } else if (check === 'daily_drawdown') {
      const days = await fetchDailyOpenAndLows(account.number, dailyFrom);
      const drawdown = days ? getWorstDailyDrawdown(days) : null;
      if (
        drawdown !== null &&
        drawdown >= TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT &&
        (await markTradeAccountBlown(account.id, 'daily_drawdown', drawdown))
      ) {
        flagged.push({ trade_account_id: account.id, number: account.number, value: drawdown });
      }
    } else {
      const lastActivity = await fetchLastActivityTimestamp(account.number);
      if (isInactiveSince(lastActivity, nowSeconds) && (await markTradeAccountInactive(account.id))) {
        const idleDays = Math.floor((nowSeconds - (lastActivity as number)) / DAY_SECONDS);
        flagged.push({ trade_account_id: account.id, number: account.number, value: idleDays });
      }
    }
  });

  return {
    check,
    started_at: now.toISOString(),
    finished_at: new Date().toISOString(),
    checked: accounts.length,
    flagged,
    errors,
  };
}
