import {
  createRenewalInvoice,
  findPartnerNeedingRenewalInvoice,
  getPartnerRenewalRef,
  listPartnersNeedingLicenseReconcile,
  markInvoiceEmailSent,
  reconcileStaleOpenLicenseInvoice,
  type RenewalInvoiceIssue,
} from '@/db/queries/partner-license-invoices';
import { sendPartnerLicenseInvoiceEmail } from '@/lib/email/ft9ja-to-partner';
import { toMoneyNumber } from '@/lib/partner-pricing';

async function notifyRenewalInvoice(
  issue: RenewalInvoiceIssue,
  invoiceId: number,
  invoiceNumber: string
) {
  try {
    await sendPartnerLicenseInvoiceEmail(
      {
        slug: issue.partner.slug,
        firm_name: issue.partner.firmName,
        owner_name: issue.partner.ownerName,
        owner_email: issue.partner.ownerEmail,
      },
      {
        invoiceId: invoiceNumber,
        dueDate: issue.dueAt,
        periodStart: issue.periodStart,
        periodEnd: issue.periodEnd,
        amount: issue.amount,
      }
    );
    await markInvoiceEmailSent(invoiceId);
  } catch (emailErr) {
    console.error(
      `[LICENSE] Failed to send renewal invoice email for partner ${issue.partner.slug}:`,
      emailErr
    );
  }
}

export async function issueAndNotifyRenewal(issue: RenewalInvoiceIssue) {
  const invoice = await createRenewalInvoice({
    partnerId: issue.partner.id,
    slug: issue.partner.slug,
    periodStart: issue.periodStart,
    periodEnd: issue.periodEnd,
    dueAt: issue.dueAt,
    invoiceNumber: issue.invoiceNumber,
    amount: issue.amount,
  });

  if (!invoice.invoice_email_sent_at) {
    await notifyRenewalInvoice(issue, invoice.id, invoice.invoice_number);
  }

  return invoice;
}

async function notifyCreatedInvoice(
  partnerId: number,
  invoice: {
    id: number;
    invoice_number: string;
    amount: string | number;
    period_start: Date | string;
    period_end: Date | string;
    due_at: Date | string;
    invoice_email_sent_at: Date | string | null;
  }
) {
  if (invoice.invoice_email_sent_at) return invoice;
  const partner = await getPartnerRenewalRef(partnerId);
  if (!partner) return invoice;

  await notifyRenewalInvoice(
    {
      partner,
      periodStart: new Date(invoice.period_start),
      periodEnd: new Date(invoice.period_end),
      dueAt: new Date(invoice.due_at),
      invoiceNumber: invoice.invoice_number,
      amount: toMoneyNumber(invoice.amount),
    },
    invoice.id,
    invoice.invoice_number
  );
  return invoice;
}

/**
 * Closes stale unpaid invoices, then issues the current-period invoice if needed.
 * Safe to call on partner admin load; no-ops when cron already issued it.
 */
export async function issueAndNotifyRenewalForPartner(
  partnerId: number,
  now: Date = new Date(),
  options: { allowSuspended?: boolean } = {}
) {
  try {
    const created = await reconcileStaleOpenLicenseInvoice(partnerId, now, options);
    if (created) {
      return await notifyCreatedInvoice(partnerId, created);
    }

    const issue = await findPartnerNeedingRenewalInvoice(partnerId, now, options);
    if (!issue) return null;
    return await issueAndNotifyRenewal(issue);
  } catch (err) {
    console.error(
      `[LICENSE] Failed to auto-issue renewal invoice for partner ${partnerId}:`,
      err
    );
    return null;
  }
}

export async function issueDueRenewalInvoices(now: Date = new Date()) {
  const partnerIds = await listPartnersNeedingLicenseReconcile();
  let issued = 0;
  let errors = 0;

  for (const partnerId of partnerIds) {
    try {
      const invoice = await issueAndNotifyRenewalForPartner(partnerId, now);
      if (invoice) issued += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `[CRON] Error issuing renewal invoice for partner ${partnerId}:`,
        err
      );
    }
  }

  return { issued, errors };
}
