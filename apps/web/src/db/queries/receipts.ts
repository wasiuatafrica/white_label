import { and, eq } from 'drizzle-orm';
import { db } from '../index';
import { evaluations } from '../schema/evaluations';
import { partnerLicenseInvoices } from '../schema/partner-license-invoices';
import { partners } from '../schema/partners';
import type { DbOrTx } from '../types';

export async function partnerOwnsReceipt(
  partnerId: number,
  receiptUrl: string,
  tx: DbOrTx = db
) {
  const [evaluation, invoice, partner] = await Promise.all([
    tx
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(and(eq(evaluations.partnerId, partnerId), eq(evaluations.paymentProofUrl, receiptUrl)))
      .limit(1),
    tx
      .select({ id: partnerLicenseInvoices.id })
      .from(partnerLicenseInvoices)
      .where(
        and(
          eq(partnerLicenseInvoices.partnerId, partnerId),
          eq(partnerLicenseInvoices.paymentProofUrl, receiptUrl)
        )
      )
      .limit(1),
    tx
      .select({ id: partners.id })
      .from(partners)
      .where(and(eq(partners.id, partnerId), eq(partners.paymentProofUrl, receiptUrl)))
      .limit(1),
  ]);

  return Boolean(evaluation[0] || invoice[0] || partner[0]);
}
