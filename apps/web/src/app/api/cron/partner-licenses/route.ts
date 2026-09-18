import { NextResponse } from 'next/server';
import {
  findInvoicesNeedingOverdueNotice,
  markOverdueEmailSent,
} from '@/db/queries/partner-license-invoices';
import { isCronAuthorized } from '@/lib/cron-auth';
import { sendPartnerSuspensionEmail } from '@/lib/email/ft9ja-to-partner';
import { issueDueRenewalInvoices } from '@/lib/partner-license-renewal';

export const dynamic = 'force-dynamic';

async function handleBillingCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const summary = {
    timestamp: now.toISOString(),
    renewalsIssued: 0,
    renewalErrors: 0,
    overdueNoticesSent: 0,
    overdueErrors: 0,
  };

  const renewalResult = await issueDueRenewalInvoices(now);
  summary.renewalsIssued = renewalResult.issued;
  summary.renewalErrors = renewalResult.errors;

  // Storefront freeze notice (7+ days after due_at, unpaid, no receipt uploaded)
  const invoicesNeedingOverdueNotice = await findInvoicesNeedingOverdueNotice(now);
  for (const inv of invoicesNeedingOverdueNotice) {
    try {
      await sendPartnerSuspensionEmail(
        {
          slug: inv.partner_slug,
          firm_name: inv.partner_firm_name,
          owner_name: inv.partner_owner_name,
          owner_email: inv.partner_owner_email,
        },
        now,
        { amount: inv.amount }
      );

      await markOverdueEmailSent(inv.id);
      summary.overdueNoticesSent += 1;
    } catch (err) {
      summary.overdueErrors += 1;
      console.error(
        `[CRON] Error processing freeze notice for invoice #${inv.invoice_number}:`,
        err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    summary,
  });
}

export async function POST(request: Request) {
  try {
    return await handleBillingCron(request);
  } catch (error) {
    console.error('[CRON] Unhandled error in partner licenses cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    return await handleBillingCron(request);
  } catch (error) {
    console.error('[CRON] Unhandled error in partner licenses cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
