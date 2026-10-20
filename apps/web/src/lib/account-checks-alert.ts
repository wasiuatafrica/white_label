import { sendEmail } from '@/app/api/utils/send-email';
import type { AccountCheck, AccountCheckSummary } from './account-checks';

const DEFAULT_ALERT_EMAIL = 'dev5.ft9a@gmail.com';

function formatSummary(summary: AccountCheckSummary) {
  const failures = summary.failures.map((f) => `  MT5 ${f.number}: ${f.message}`).join('\n');
  const more =
    summary.errors > summary.failures.length
      ? `\n  …and ${summary.errors - summary.failures.length} more (see Heroku logs)`
      : '';
  return [
    `Check: ${summary.check}`,
    `Started: ${summary.started_at}`,
    `Finished: ${summary.finished_at}`,
    `Accounts checked: ${summary.checked}`,
    `Accounts flagged: ${summary.flagged.length}`,
    `Errors: ${summary.errors}`,
    '',
    'Failed accounts:',
    failures + more,
  ].join('\n');
}

/**
 * Emails the dev team when an account check errors: either some accounts failed (`summary`)
 * or the whole run threw (`error`). Never throws; a failed alert is only logged.
 */
export async function sendAccountCheckAlert(
  check: AccountCheck,
  outcome: { summary: AccountCheckSummary } | { error: unknown }
) {
  const to = process.env.ACCOUNT_CHECKS_ALERT_EMAIL || DEFAULT_ALERT_EMAIL;
  const subject =
    'summary' in outcome
      ? `[FT9ja cron] ${check}: ${outcome.summary.errors} account error${outcome.summary.errors === 1 ? '' : 's'}`
      : `[FT9ja cron] ${check} failed`;
  const text =
    'summary' in outcome
      ? formatSummary(outcome.summary)
      : `The ${check} check did not complete.\n\n${
          outcome.error instanceof Error
            ? outcome.error.stack || outcome.error.message
            : String(outcome.error)
        }`;

  try {
    await sendEmail({ to, subject, text });
  } catch (error) {
    console.error('[CRON] Failed to send account check alert email', error);
  }
}
