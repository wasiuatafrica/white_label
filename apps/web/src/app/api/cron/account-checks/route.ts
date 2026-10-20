import { after, NextResponse } from 'next/server';
import { ACCOUNT_CHECKS, type AccountCheck, runAccountCheck } from '@/lib/account-checks';
import { sendAccountCheckAlert } from '@/lib/account-checks-alert';
import { isCronAuthorized } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

// One run per check at a time on this dyno (Scheduler retries or manual triggers overlap).
const running = new Set<AccountCheck>();

/**
 * Heroku Scheduler daily jobs (Africa/Lagos, Scheduler runs in UTC):
 *   16:00 (15:00 UTC)  ?check=inactivity
 *   19:00 (18:00 UTC)  ?check=account_drawdown
 *   23:30 (22:30 UTC)  ?check=daily_drawdown   (yesterday + today; &from=all re-checks full history)
 *
 * Responds 202 and runs after the response so long runs outlive Heroku's 30s router timeout.
 * Add &wait=1 to run inline and get the summary back (local / manual use).
 */
async function handleAccountChecks(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const check = url.searchParams.get('check') as AccountCheck | null;
  if (!check || !ACCOUNT_CHECKS.includes(check)) {
    return NextResponse.json(
      { error: `check must be one of: ${ACCOUNT_CHECKS.join(', ')}` },
      { status: 400 }
    );
  }
  if (running.has(check)) {
    return NextResponse.json({ error: `${check} is already running` }, { status: 409 });
  }

  const options = url.searchParams.get('from') === 'all' ? { dailyFromTimestamp: 0 } : {};
  running.add(check);
  const run = async () => {
    try {
      const summary = await runAccountCheck(check, options);
      console.log('[CRON] account check finished', JSON.stringify(summary));
      if (summary.errors > 0) await sendAccountCheckAlert(check, { summary });
      return summary;
    } catch (error) {
      await sendAccountCheckAlert(check, { error });
      throw error;
    } finally {
      running.delete(check);
    }
  };

  if (url.searchParams.get('wait') === '1') {
    return NextResponse.json({ ok: true, summary: await run() });
  }

  after(() =>
    run().catch((error) => console.error(`[CRON] Unhandled error in ${check} check:`, error))
  );
  return NextResponse.json({ ok: true, started: check }, { status: 202 });
}

export async function POST(request: Request) {
  try {
    return await handleAccountChecks(request);
  } catch (error) {
    console.error('[CRON] Unhandled error in account checks cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
