// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';
import { applyPgliteSchema } from '@/db/pglite-schema';
import * as schema from '@/db/schema';
import { evaluations } from '@/db/schema/evaluations';
import { partnerLicenseInvoices } from '@/db/schema/partner-license-invoices';
import { partners } from '@/db/schema/partners';
import { traders } from '@/db/schema/traders';
import type { DbOrTx } from '@/db/types';
import { partnerOwnsReceipt } from '@/db/queries/receipts';

describe('partnerOwnsReceipt', { timeout: 30_000 }, () => {
  async function setupTestDb() {
    const client = new PGlite();
    await client.waitReady;
    const db = drizzle({ client, schema }) as unknown as DbOrTx;
    await applyPgliteSchema(client);
    return { client, db };
  }

  it('allows apply and license invoice receipts, not another partner URL', async () => {
    const { client, db } = await setupTestDb();
    try {
      const applyReceiptUrl = 'https://bucket.s3.eu-west-1.amazonaws.com/uploads/receipts/2026-09-16/apply.jpg';
      const licenseReceiptUrl =
        'https://bucket.s3.eu-west-1.amazonaws.com/uploads/receipts/2026-09-16/license.jpg';
      const evalReceiptUrl =
        'https://bucket.s3.eu-west-1.amazonaws.com/uploads/receipts/acme/2026-09-16/eval.jpg';
      const otherReceiptUrl =
        'https://bucket.s3.eu-west-1.amazonaws.com/uploads/receipts/2026-09-16/other.jpg';

      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'acme',
          firmName: 'Acme',
          ownerEmail: 'acme@example.com',
          adminPin: '123456',
          paymentProofUrl: applyReceiptUrl,
        })
        .returning();

      const [otherPartner] = await db
        .insert(partners)
        .values({
          slug: 'other',
          firmName: 'Other',
          ownerEmail: 'other@example.com',
          adminPin: '123456',
          paymentProofUrl: otherReceiptUrl,
        })
        .returning();

      await db.insert(partnerLicenseInvoices).values({
        partnerId: partner.id,
        invoiceNumber: 'INV-ACME-20260916',
        amount: '95000',
        status: 'receipt_uploaded',
        periodStart: new Date(Date.UTC(2026, 8, 16)),
        periodEnd: new Date(Date.UTC(2026, 9, 16)),
        dueAt: new Date(Date.UTC(2026, 8, 16)),
        paymentProofUrl: licenseReceiptUrl,
      });

      const [trader] = await db
        .insert(traders)
        .values({
          partnerId: partner.id,
          name: 'Trader',
          email: 'trader@example.com',
        })
        .returning();

      await db.insert(evaluations).values({
        partnerId: partner.id,
        traderId: trader.id,
        evalType: 'SSL',
        amount: '49000',
        paymentProofUrl: evalReceiptUrl,
      });

      await expect(partnerOwnsReceipt(partner.id, applyReceiptUrl, db)).resolves.toBe(true);
      await expect(partnerOwnsReceipt(partner.id, licenseReceiptUrl, db)).resolves.toBe(true);
      await expect(partnerOwnsReceipt(partner.id, evalReceiptUrl, db)).resolves.toBe(true);
      await expect(partnerOwnsReceipt(partner.id, otherReceiptUrl, db)).resolves.toBe(false);
      await expect(partnerOwnsReceipt(otherPartner.id, applyReceiptUrl, db)).resolves.toBe(false);
    } finally {
      await client.close();
    }
  });
});
