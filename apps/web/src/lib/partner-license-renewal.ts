import {
  createRenewalInvoice,
  findPartnerNeedingRenewalInvoice,
  findPartnersNeedingRenewalInvoice,
  markInvoiceEmailSent,
  type RenewalInvoiceIssue,
} from '@/db/queries/partner-license-invoices';
import { sendPartnerLicenseInvoiceEmail } from '@/lib/email/ft9ja-to-partner';

async function notifyRenewalInvoice(issue: RenewalInvoiceIssue, invoiceId: number, invoiceNumber: string) {
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
  });

  if (!invoice.invoice_email_sent_at) {
    await notifyRenewalInvoice(issue, invoice.id, invoice.invoice_number);
  }

  return invoice;
}

/**
 * Creates the next pending 30-day invoice if the latest period has already
 * ended. Safe to call on partner admin load; no-ops when cron already issued it.
 */
export async function issueAndNotifyRenewalForPartner(
  partnerId: number,
  now: Date = new Date(),
  options: { allowSuspended?: boolean } = {}
) {
  const issue = await findPartnerNeedingRenewalInvoice(partnerId, now, options);
  if (!issue) return null;

  try {
    return await issueAndNotifyRenewal(issue);
  } catch (err) {
    console.error(
      `[LICENSE] Failed to auto-issue renewal invoice for partner ${issue.partner.slug}:`,
      err
    );
    return null;
  }
}

export async function issueDueRenewalInvoices(now: Date = new Date()) {
  const partnersNeedingRenewal = await findPartnersNeedingRenewalInvoice(now);
  let issued = 0;
  let errors = 0;

  for (const item of partnersNeedingRenewal) {
    try {
      await issueAndNotifyRenewal(item);
      issued += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `[CRON] Error issuing renewal invoice for partner ${item.partner.slug}:`,
        err
      );
    }
  }

  return { issued, errors };
}
