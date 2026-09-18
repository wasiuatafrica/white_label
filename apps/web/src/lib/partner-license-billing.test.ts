// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { applyPgliteSchema } from '@/db/pglite-schema';
import * as schema from '@/db/schema';
import { partners } from '@/db/schema/partners';
import {
  addDays,
  applyRecurringLicenseExemption,
  computeNextPeriod,
  exemptLicenseCoverage,
  formatCalendarYmd,
  formatPeriodRange,
  generateInvoiceNumber,
  getInvoiceLifecycleStatus,
  isCalendarYmd,
  isInvoiceCovered,
  isInvoiceEligibleForOverdue,
  isLicenseStorefrontFrozen,
  OVERDUE_GRACE_PERIOD_MS,
  shiftToCalendarDate,
  summarizeLicenseCoverage,
} from './partner-license-billing';
import type { DbOrTx } from '@/db/types';
import {
  createRenewalInvoice,
  findInvoicesNeedingOverdueNotice,
  findPartnerNeedingRenewalInvoice,
  findPartnersNeedingRenewalInvoice,
  getBatchPartnerLicenseCoverage,
  getPartnerLicenseCoverage,
  grantComplimentaryLicensePeriod,
  listLicenseInvoicesForPartner,
  markOverdueEmailSent,
  recordFirstActivationPaidInvoice,
  reconcileStaleOpenLicenseInvoice,
  reviewLicenseInvoice,
  uploadPartnerLicenseReceipt,
} from '@/db/queries/partner-license-invoices';
import {
  addCalendarMonthsLagos,
  isLicenseRecurringExempt,
  PARTNER_LICENSE_FEE,
  PARTNER_LICENSE_INTRO_FEE,
  PARTNER_LICENSE_PERIOD_DAYS,
} from './partner-pricing';

describe('Partner License Billing - Unit & Period Math', () => {
  it('adds exact 30-day (720h) periods correctly across varying month lengths', () => {
    // 31 Jan 2026 + 30 days -> 2 Mar 2026 (Feb 2026 has 28 days: Jan 31 + 28 days = Feb 28; +2 days = Mar 2)
    const jan31 = new Date(Date.UTC(2026, 0, 31, 10, 0, 0));
    const nextPeriodEnd = addDays(jan31, PARTNER_LICENSE_PERIOD_DAYS);
    expect(nextPeriodEnd.getUTCFullYear()).toBe(2026);
    expect(nextPeriodEnd.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(nextPeriodEnd.getUTCDate()).toBe(2);
    expect(nextPeriodEnd.getTime() - jan31.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('shifts a period start to a new calendar date while keeping clock time', () => {
    const original = new Date(Date.UTC(2026, 8, 17, 8, 47, 0));
    expect(formatCalendarYmd(original)).toBe('2026-09-17');
    expect(isCalendarYmd('2026-09-16')).toBe(true);
    expect(isCalendarYmd('2026-02-31')).toBe(false);

    const shifted = shiftToCalendarDate(original, '2026-09-16');
    expect(shifted.toISOString()).toBe('2026-09-16T08:47:00.000Z');
    expect(addDays(shifted, 30).toISOString()).toBe('2026-10-16T08:47:00.000Z');
    expect(shiftToCalendarDate(original, '2026-09-17').toISOString()).toBe(original.toISOString());
    expect(() => shiftToCalendarDate(original, '2026-02-31')).toThrow(/Invalid calendar date/);
  });

  it('computes next period aligned with previous periodEnd without sliding', () => {
    const period1Start = new Date(Date.UTC(2026, 8, 16, 0, 0, 0)); // 16 Sep 2026
    const period1End = addDays(period1Start, 30); // 16 Oct 2026

    const next = computeNextPeriod(period1End);
    expect(next.periodStart.toISOString()).toBe(period1End.toISOString());
    expect(next.dueAt.toISOString()).toBe(period1End.toISOString());
    expect(next.periodEnd.getTime() - next.periodStart.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('generates consistent invoice numbers with YYYYMMDD in UTC', () => {
    const start = new Date(Date.UTC(2026, 8, 16, 12, 0, 0));
    const invNum = generateInvoiceNumber('prime-traders', start);
    expect(invNum).toBe('INV-PRIME-TRADERS-20260916');
  });

  it('formats period range in Lagos timezone', () => {
    const start = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
    const end = addDays(start, 30);
    const range = formatPeriodRange(start, end);
    expect(range).toMatch(/16 Sep.* 2026/);
    expect(range).toMatch(/16 Oct 2026/);
  });

  describe('isInvoiceCovered', () => {
    const start = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
    const end = addDays(start, 30);

    it('returns true when paid and now is inside the window [start, end)', () => {
      const mid = new Date(Date.UTC(2026, 8, 25, 12, 0, 0));
      expect(isInvoiceCovered({ status: 'paid', periodStart: start, periodEnd: end }, mid)).toBe(
        true
      );
      // Exactly at start
      expect(isInvoiceCovered({ status: 'paid', periodStart: start, periodEnd: end }, start)).toBe(
        true
      );
    });

    it('returns true when waived (complimentary grant) inside window', () => {
      const mid = new Date(Date.UTC(2026, 8, 25, 12, 0, 0));
      expect(isInvoiceCovered({ status: 'waived', periodStart: start, periodEnd: end }, mid)).toBe(
        true
      );
    });

    it('returns false when status is pending, overdue, receipt_uploaded, or not_paid', () => {
      const mid = new Date(Date.UTC(2026, 8, 25, 12, 0, 0));
      expect(
        isInvoiceCovered({ status: 'pending', periodStart: start, periodEnd: end }, mid)
      ).toBe(false);
      expect(
        isInvoiceCovered({ status: 'overdue', periodStart: start, periodEnd: end }, mid)
      ).toBe(false);
      expect(
        isInvoiceCovered({ status: 'receipt_uploaded', periodStart: start, periodEnd: end }, mid)
      ).toBe(false);
      expect(
        isInvoiceCovered({ status: 'not_paid', periodStart: start, periodEnd: end }, mid)
      ).toBe(false);
    });

    it('returns false when now is at or past periodEnd', () => {
      expect(isInvoiceCovered({ status: 'paid', periodStart: start, periodEnd: end }, end)).toBe(
        false
      );
      const after = addDays(end, 1);
      expect(isInvoiceCovered({ status: 'paid', periodStart: start, periodEnd: end }, after)).toBe(
        false
      );
    });
  });

  describe('isInvoiceEligibleForOverdue', () => {
    const dueAt = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));

    it('returns false if less than 7 days past due', () => {
      const now6Days = new Date(dueAt.getTime() + 6 * 24 * 60 * 60 * 1000);
      expect(isInvoiceEligibleForOverdue({ status: 'pending', dueAt }, now6Days)).toBe(false);
    });

    it('returns true if >= 7 days past due and unpaid with no receipt', () => {
      const now7Days = new Date(dueAt.getTime() + OVERDUE_GRACE_PERIOD_MS);
      expect(isInvoiceEligibleForOverdue({ status: 'pending', dueAt }, now7Days)).toBe(true);
    });

    it('skips overdue if receipt has been uploaded', () => {
      const now10Days = new Date(dueAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      expect(
        isInvoiceEligibleForOverdue(
          {
            status: 'pending',
            dueAt,
            paymentProofUrl: 'https://s3.amazonaws.com/receipt.png',
          },
          now10Days
        )
      ).toBe(false);

      expect(
        isInvoiceEligibleForOverdue(
          {
            status: 'pending',
            dueAt,
            receiptUploadedAt: new Date(),
          },
          now10Days
        )
      ).toBe(false);
    });
  });

  describe('summarizeLicenseCoverage / next due date', () => {
    const start = new Date(Date.UTC(2026, 6, 18, 12, 5, 0)); // 18 Jul 2026
    const end = addDays(start, 30); // 17 Aug 2026
    const paidInvoice = {
      status: 'paid',
      periodStart: start,
      periodEnd: end,
      dueAt: start,
    };

    it('uses period_end as next due while a paid invoice is still in force', () => {
      const mid = new Date(Date.UTC(2026, 6, 25, 12, 0, 0));
      const coverage = summarizeLicenseCoverage(paidInvoice, mid);
      expect(coverage.isCovered).toBe(true);
      expect(coverage.status).toBe('paid');
      expect(coverage.nextDueAt?.toISOString()).toBe(end.toISOString());
    });

    it('marks an expired paid invoice as expired and keeps next due at period_end', () => {
      const afterEnd = new Date(Date.UTC(2026, 8, 16, 12, 0, 0)); // 16 Sep 2026
      const coverage = summarizeLicenseCoverage(paidInvoice, afterEnd);
      expect(coverage.isCovered).toBe(false);
      expect(coverage.status).toBe('expired');
      expect(coverage.nextDueAt?.toISOString()).toBe(end.toISOString());
      expect(getInvoiceLifecycleStatus(paidInvoice, afterEnd)).toBe('expired');
    });

    it('uses due_at as next due for an open unpaid invoice', () => {
      const pending = {
        status: 'pending',
        periodStart: end,
        periodEnd: addDays(end, 30),
        dueAt: end,
      };
      const coverage = summarizeLicenseCoverage(pending, end);
      expect(coverage.isCovered).toBe(false);
      expect(coverage.status).toBe('pending');
      expect(coverage.nextDueAt?.toISOString()).toBe(end.toISOString());
    });
  });

  describe('recurring license exemption', () => {
    it('exempts the apexfunds slug and ignores case/whitespace', () => {
      expect(isLicenseRecurringExempt('apexfunds')).toBe(true);
      expect(isLicenseRecurringExempt(' ApexFunds ')).toBe(true);
      expect(isLicenseRecurringExempt('gammafirm')).toBe(false);
      expect(isLicenseRecurringExempt(null)).toBe(false);
    });

    it('overlays coverage as ongoing and paid with no next due date', () => {
      const expired = summarizeLicenseCoverage(
        {
          status: 'paid',
          periodStart: new Date(Date.UTC(2026, 6, 18)),
          periodEnd: new Date(Date.UTC(2026, 7, 17)),
          dueAt: new Date(Date.UTC(2026, 6, 18)),
        },
        new Date(Date.UTC(2026, 8, 16))
      );
      expect(expired.isCovered).toBe(false);

      const exempt = applyRecurringLicenseExemption('apexfunds', expired);
      expect(exempt).toEqual(exemptLicenseCoverage());
      expect(exempt.isCovered).toBe(true);
      expect(exempt.status).toBe('exempt');
      expect(exempt.nextDueAt).toBeNull();
      expect(applyRecurringLicenseExemption('gammafirm', expired)).toEqual(expired);
    });
  });

  describe('isLicenseStorefrontFrozen', () => {
    const dueAt = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
    const periodEnd = addDays(dueAt, 30);
    const pendingCoverage = summarizeLicenseCoverage(
      {
        status: 'pending',
        periodStart: dueAt,
        periodEnd,
        dueAt,
      },
      dueAt
    );

    it('is not frozen 6 days after due and is frozen at 7 days', () => {
      const day6 = new Date(dueAt.getTime() + 6 * 24 * 60 * 60 * 1000);
      const day7 = new Date(dueAt.getTime() + OVERDUE_GRACE_PERIOD_MS);
      expect(isLicenseStorefrontFrozen(pendingCoverage, { status: 'pending' }, day6)).toBe(false);
      expect(isLicenseStorefrontFrozen(pendingCoverage, { status: 'pending' }, day7)).toBe(true);
    });

    it('does not freeze when a receipt is in review after day 7', () => {
      const day8 = new Date(dueAt.getTime() + 8 * 24 * 60 * 60 * 1000);
      expect(
        isLicenseStorefrontFrozen(
          pendingCoverage,
          { status: 'receipt_uploaded', paymentProofUrl: 'https://s3.example.com/r.png' },
          day8
        )
      ).toBe(false);
    });

    it('does not freeze when currently covered', () => {
      const day10 = new Date(dueAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      const covered = summarizeLicenseCoverage(
        {
          status: 'paid',
          periodStart: dueAt,
          periodEnd,
          dueAt,
        },
        dueAt
      );
      expect(isLicenseStorefrontFrozen(covered, { status: 'paid' }, day10)).toBe(false);
    });

    it('does not freeze exempt partners', () => {
      const day10 = new Date(dueAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      expect(
        isLicenseStorefrontFrozen(exemptLicenseCoverage(), { status: 'pending' }, day10)
      ).toBe(false);
    });
  });
});

describe('Partner License Billing - Database Operations (PGlite)', { timeout: 60_000 }, () => {
  async function setupTestDb() {
    const client = new PGlite();
    await client.waitReady;
    const db = drizzle({ client, schema }) as unknown as DbOrTx;
    await applyPgliteSchema(client);
    return { client, db };
  }

  it('records first activation paid invoice on approval and sets monthlyFeePaid', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'testfirm',
          firmName: 'Test Firm',
          ownerEmail: 'test@example.com',
          status: 'pending',
          adminPin: '123456',
          paymentProofUrl: 'https://s3.example.com/receipt-initial.jpg',
          monthlyFeePaid: false,
        })
        .returning();

      const activatedAt = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
      const invoice = await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          paymentProofUrl: partner.paymentProofUrl,
          activatedAt,
        },
        db
      );

      expect(invoice).not.toBeNull();
      expect(invoice?.status).toBe('paid');
      expect(invoice?.invoice_number).toBe('INV-TESTFIRM-20260916');
      expect(Number(invoice?.amount)).toBe(PARTNER_LICENSE_FEE);
      expect(new Date(invoice!.period_end).getTime() - activatedAt.getTime()).toBe(
        30 * 24 * 60 * 60 * 1000
      );

      const coverage = await getPartnerLicenseCoverage(partner.id, activatedAt, db);
      expect(coverage.isCovered).toBe(true);
      expect(coverage.status).toBe('paid');
      expect(coverage.nextDueAt?.getTime()).toBe(new Date(invoice!.period_end).getTime());

      const expiredCoverage = await getPartnerLicenseCoverage(
        partner.id,
        new Date(invoice!.period_end),
        db
      );
      expect(expiredCoverage.isCovered).toBe(false);
      expect(expiredCoverage.status).toBe('expired');
      expect(expiredCoverage.nextDueAt?.getTime()).toBe(new Date(invoice!.period_end).getTime());

      // Idempotency check: calling again does not create a duplicate
      const duplicate = await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          paymentProofUrl: partner.paymentProofUrl,
          activatedAt,
        },
        db
      );
      expect(duplicate).toBeNull();
    } finally {
      await client.close();
    }
  });

  it('handles receipt upload and review transitions (approve, reject, waive)', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'alphaprop',
          firmName: 'Alpha Prop',
          ownerEmail: 'alpha@example.com',
          status: 'active',
          adminPin: '123456',
          monthlyFeePaid: false,
        })
        .returning();

      const periodStart = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
      const periodEnd = addDays(periodStart, 30);
      const invoice = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart,
          periodEnd,
          dueAt: periodStart,
          invoiceNumber: 'INV-ALPHAPROP-20260916',
        },
        db
      );

      expect(invoice.status).toBe('pending');

      // 1. Partner uploads receipt
      const uploaded = await uploadPartnerLicenseReceipt(
        {
          partnerId: partner.id,
          invoiceId: invoice.id,
          paymentProofUrl: 'https://s3.example.com/receipt2.png',
        },
        db
      );
      expect(uploaded.status).toBe('receipt_uploaded');
      expect(uploaded.payment_proof_url).toBe('https://s3.example.com/receipt2.png');

      // 2. Super Admin rejects receipt
      const rejected = await reviewLicenseInvoice(
        {
          invoiceId: invoice.id,
          action: 'reject',
          verificationNote: 'Image too blurry',
          reviewedBy: 'admin@ft9ja.com',
        },
        db
      );
      expect(rejected.invoice.status).toBe('pending');
      expect(rejected.invoice.verification_note).toBe('Image too blurry');
      expect(rejected.invoice.payment_proof_url).toBeNull();

      // 3. Partner re-uploads
      await uploadPartnerLicenseReceipt(
        {
          partnerId: partner.id,
          invoiceId: invoice.id,
          paymentProofUrl: 'https://s3.example.com/receipt-fixed.png',
        },
        db
      );

      // 4. Super Admin approves receipt
      const approved = await reviewLicenseInvoice(
        {
          invoiceId: invoice.id,
          action: 'approve',
          verifiedAmount: 95000,
          verificationNote: 'Transfer confirmed in Zenith',
          reviewedBy: 'admin@ft9ja.com',
        },
        db
      );
      expect(approved.invoice.status).toBe('paid');
      expect(approved.invoice.verified_amount).toBe('95000.00');

      const coverageAfterApprove = await getPartnerLicenseCoverage(
        partner.id,
        new Date(Date.UTC(2026, 8, 20)),
        db
      );
      expect(coverageAfterApprove.isCovered).toBe(true);
    } finally {
      await client.close();
    }
  });

  it('marks a pending invoice paid without a receipt and can shift the 30-day window', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'offlinepay',
          firmName: 'Offline Pay',
          ownerEmail: 'offlinepay@example.com',
          status: 'active',
          adminPin: '123456',
          monthlyFeePaid: false,
        })
        .returning();

      const periodStart = new Date(Date.UTC(2026, 8, 17, 8, 47, 0));
      const invoice = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart,
          periodEnd: addDays(periodStart, 30),
          dueAt: periodStart,
          invoiceNumber: 'INV-OFFLINEPAY-20260917',
        },
        db
      );

      await expect(
        reviewLicenseInvoice(
          {
            invoiceId: invoice.id,
            action: 'approve',
            verifiedAmount: 95000,
            reviewedBy: 'admin@ft9ja.com',
          },
          db
        )
      ).rejects.toThrow(/marking paid without a receipt/);

      const approved = await reviewLicenseInvoice(
        {
          invoiceId: invoice.id,
          action: 'approve',
          verifiedAmount: 95000,
          verificationNote: 'Paid by transfer 16 Sep 2026, before license workflow launch',
          periodStartDate: '2026-09-16',
          reviewedBy: 'admin@ft9ja.com',
        },
        db
      );

      expect(approved.invoice.status).toBe('paid');
      expect(approved.invoice.payment_proof_url).toBeNull();
      expect(approved.invoice.invoice_number).toBe('INV-OFFLINEPAY-20260917');
      expect(new Date(approved.invoice.period_start).toISOString()).toBe(
        '2026-09-16T08:47:00.000Z'
      );
      expect(new Date(approved.invoice.period_end).toISOString()).toBe(
        '2026-10-16T08:47:00.000Z'
      );

      const coverage = await getPartnerLicenseCoverage(
        partner.id,
        new Date(Date.UTC(2026, 8, 20, 12, 0, 0)),
        db
      );
      expect(coverage.isCovered).toBe(true);
      expect(coverage.status).toBe('paid');
    } finally {
      await client.close();
    }
  });

  it('grant complimentary extends coverage without sliding anniversary', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'betafund',
          firmName: 'Beta Fund',
          ownerEmail: 'beta@example.com',
          status: 'active',
          adminPin: '123456',
        })
        .returning();

      const start = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
      await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          activatedAt: start,
        },
        db
      );

      // Grant complimentary when no open unpaid invoice exists: extends from latest period_end (16 Oct -> 15 Nov)
      const compInvoice = await grantComplimentaryLicensePeriod(
        {
          partnerId: partner.id,
          slug: partner.slug,
          reason: 'Partner anniversary celebration grant',
        },
        db
      );

      expect(compInvoice.status).toBe('waived');
      expect(new Date(compInvoice.period_start).toISOString()).toBe(addDays(start, 30).toISOString());
      expect(new Date(compInvoice.period_end).toISOString()).toBe(addDays(start, 60).toISOString());

      // Coverage should be active inside the second month
      const midMonth2 = new Date(Date.UTC(2026, 9, 20)); // 20 Oct 2026
      const coverage = await getPartnerLicenseCoverage(partner.id, midMonth2, db);
      expect(coverage.isCovered).toBe(true);
      expect(coverage.status).toBe('waived');
    } finally {
      await client.close();
    }
  });

  it('identifies partners needing renewal invoices and overdue notices accurately', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'gammafirm',
          firmName: 'Gamma Firm',
          ownerEmail: 'gamma@example.com',
          status: 'active',
          adminPin: '123456',
        })
        .returning();

      const start = new Date(Date.UTC(2026, 7, 1, 0, 0, 0)); // 1 Aug 2026
      await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          activatedAt: start,
        },
        db
      );

      // Check on 10 Aug: period end is 31 Aug, so no renewal needed yet
      const needingRenewalEarly = await findPartnersNeedingRenewalInvoice(
        new Date(Date.UTC(2026, 7, 10)),
        db
      );
      expect(needingRenewalEarly.some((p) => p.partner.id === partner.id)).toBe(false);

      // Check on 31 Aug (periodEnd reached): renewal is needed
      const needingRenewalAtEnd = await findPartnersNeedingRenewalInvoice(
        new Date(Date.UTC(2026, 7, 31, 0, 0, 0)),
        db
      );
      const target = needingRenewalAtEnd.find((p) => p.partner.id === partner.id);
      expect(target).toBeDefined();
      expect(target?.periodStart.toISOString()).toBe(addDays(start, 30).toISOString());

      // Create renewal invoice
      const invoice2 = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart: target!.periodStart,
          periodEnd: target!.periodEnd,
          dueAt: target!.dueAt,
          invoiceNumber: target!.invoiceNumber,
        },
        db
      );

      // Immediately after creation (dueAt is 31 Aug), check overdue on 5 Sep (5 days past due): not overdue yet
      const overdueEarly = await findInvoicesNeedingOverdueNotice(
        new Date(Date.UTC(2026, 8, 5)),
        db
      );
      expect(overdueEarly.some((inv) => inv.id === invoice2.id)).toBe(false);

      // On 8 Sep (8 days past due, no receipt uploaded): eligible for overdue notice
      const overdueDue = await findInvoicesNeedingOverdueNotice(
        new Date(Date.UTC(2026, 8, 8)),
        db
      );
      expect(overdueDue.some((inv) => inv.id === invoice2.id)).toBe(true);

      // Mark overdue notice sent
      await markOverdueEmailSent(invoice2.id, db);

      // Should not be sent again (idempotent)
      const overdueAfter = await findInvoicesNeedingOverdueNotice(
        new Date(Date.UTC(2026, 8, 9)),
        db
      );
      expect(overdueAfter.some((inv) => inv.id === invoice2.id)).toBe(false);
    } finally {
      await client.close();
    }
  });

  it('auto-issues the next pending invoice when the latest period has ended', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'render',
          firmName: 'Renewal Render',
          ownerEmail: 'render@example.com',
          status: 'active',
          adminPin: '123456',
        })
        .returning();

      const start = new Date(Date.UTC(2026, 6, 18, 12, 5, 0));
      await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          activatedAt: start,
        },
        db
      );

      const afterEnd = addDays(start, 30);
      const issue = await findPartnerNeedingRenewalInvoice(partner.id, afterEnd, {
        tx: db,
      });
      expect(issue).not.toBeNull();
      expect(issue?.periodStart.toISOString()).toBe(afterEnd.toISOString());
      expect(issue?.invoiceNumber).toBe('INV-RENDER-20260817');

      const created = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart: issue!.periodStart,
          periodEnd: issue!.periodEnd,
          dueAt: issue!.dueAt,
          invoiceNumber: issue!.invoiceNumber,
        },
        db
      );
      expect(created.status).toBe('pending');

      const again = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart: issue!.periodStart,
          periodEnd: issue!.periodEnd,
          dueAt: issue!.dueAt,
          invoiceNumber: issue!.invoiceNumber,
        },
        db
      );
      expect(again.id).toBe(created.id);

      const afterCreate = await findPartnerNeedingRenewalInvoice(partner.id, afterEnd, {
        tx: db,
      });
      expect(afterCreate).toBeNull();

      const invoices = await listLicenseInvoicesForPartner(partner.id, db);
      expect(invoices).toHaveLength(2);
    } finally {
      await client.close();
    }
  });

  it('skips recurring invoices and overdue notices for exempt partners', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [exemptPartner] = await db
        .insert(partners)
        .values({
          slug: 'apexfunds',
          firmName: 'Apex Funds',
          ownerEmail: 'apex@example.com',
          status: 'active',
          adminPin: '123456',
        })
        .returning();

      const start = new Date(Date.UTC(2026, 6, 18, 12, 5, 0));
      await recordFirstActivationPaidInvoice(
        {
          partnerId: exemptPartner.id,
          slug: exemptPartner.slug,
          activatedAt: start,
        },
        db
      );

      const afterEnd = addDays(start, 30);
      expect(await findPartnerNeedingRenewalInvoice(exemptPartner.id, afterEnd, { tx: db })).toBeNull();

      const needingRenewal = await findPartnersNeedingRenewalInvoice(afterEnd, db);
      expect(needingRenewal.some((item) => item.partner.slug === 'apexfunds')).toBe(false);

      const coverage = await getPartnerLicenseCoverage(exemptPartner.id, afterEnd, db);
      expect(coverage.isCovered).toBe(true);
      expect(coverage.status).toBe('exempt');
      expect(coverage.nextDueAt).toBeNull();

      const batch = await getBatchPartnerLicenseCoverage([exemptPartner.id], afterEnd, db);
      expect(batch.get(exemptPartner.id)?.status).toBe('exempt');
      expect(batch.get(exemptPartner.id)?.isCovered).toBe(true);

      const leftover = await createRenewalInvoice(
        {
          partnerId: exemptPartner.id,
          slug: exemptPartner.slug,
          periodStart: afterEnd,
          periodEnd: addDays(afterEnd, 30),
          dueAt: afterEnd,
          invoiceNumber: 'INV-APEXFUNDS-20260817',
        },
        db
      );
      const overdue = await findInvoicesNeedingOverdueNotice(addDays(afterEnd, 8), db);
      expect(overdue.some((inv) => inv.id === leftover.id)).toBe(false);

      await expect(
        uploadPartnerLicenseReceipt(
          {
            partnerId: exemptPartner.id,
            paymentProofUrl: 'https://s3.example.com/apex-receipt.jpg',
          },
          db
        )
      ).rejects.toThrow('exempt from recurring license invoices');
    } finally {
      await client.close();
    }
  });

  it('records an intro-priced activation invoice and rolls a stale unpaid invoice to not_paid', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [partner] = await db
        .insert(partners)
        .values({
          slug: 'introfirm',
          firmName: 'Intro Firm',
          ownerEmail: 'intro@example.com',
          status: 'pending',
          adminPin: '123456',
          licenseIntroEligible: true,
          monthlyFeePaid: false,
        })
        .returning();

      const activatedAt = new Date(Date.UTC(2026, 8, 18, 0, 0, 0));
      const invoice = await recordFirstActivationPaidInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          activatedAt,
        },
        db
      );

      expect(Number(invoice?.amount)).toBe(PARTNER_LICENSE_INTRO_FEE);
      await db
        .update(partners)
        .set({ status: 'active' })
        .where(eq(partners.id, partner.id));
      const [updated] = await db
        .select({ licenseIntroEndsAt: partners.licenseIntroEndsAt })
        .from(partners)
        .where(eq(partners.id, partner.id))
        .limit(1);
      expect(updated.licenseIntroEndsAt?.toISOString()).toBe(
        addCalendarMonthsLagos(activatedAt, 3).toISOString()
      );

      const renewalStart = addDays(activatedAt, 30);
      const renewal = await createRenewalInvoice(
        {
          partnerId: partner.id,
          slug: partner.slug,
          periodStart: renewalStart,
          periodEnd: addDays(renewalStart, 30),
          dueAt: renewalStart,
          invoiceNumber: 'INV-INTROFIRM-20261018',
        },
        db
      );
      expect(Number(renewal.amount)).toBe(PARTNER_LICENSE_INTRO_FEE);

      const afterLapse = addCalendarMonthsLagos(activatedAt, 4);
      const current = await reconcileStaleOpenLicenseInvoice(partner.id, afterLapse, {
        tx: db,
      });
      expect(current).not.toBeNull();
      expect(Number(current?.amount)).toBe(PARTNER_LICENSE_FEE);
      expect(new Date(current!.period_start).getTime()).toBeGreaterThanOrEqual(
        addCalendarMonthsLagos(activatedAt, 3).getTime()
      );

      const history = await listLicenseInvoicesForPartner(partner.id, db);
      const stale = history.find((row) => row.id === renewal.id);
      expect(stale?.status).toBe('not_paid');
      expect(Number(stale?.amount)).toBe(PARTNER_LICENSE_INTRO_FEE);
      expect(
        isInvoiceCovered(
          {
            status: 'not_paid',
            periodStart: new Date(stale!.period_start),
            periodEnd: new Date(stale!.period_end),
          },
          afterLapse
        )
      ).toBe(false);

      const stillSamePeriod = addDays(renewalStart, 10);
      const [samePeriodPartner] = await db
        .insert(partners)
        .values({
          slug: 'introearly',
          firmName: 'Intro Early',
          ownerEmail: 'introearly@example.com',
          status: 'active',
          adminPin: '123456',
          licenseIntroEligible: true,
        })
        .returning();
      await recordFirstActivationPaidInvoice(
        {
          partnerId: samePeriodPartner.id,
          slug: samePeriodPartner.slug,
          activatedAt,
        },
        db
      );
      const openRenewal = await createRenewalInvoice(
        {
          partnerId: samePeriodPartner.id,
          slug: samePeriodPartner.slug,
          periodStart: renewalStart,
          periodEnd: addDays(renewalStart, 30),
          dueAt: renewalStart,
          invoiceNumber: 'INV-INTROEARLY-20261018',
        },
        db
      );
      const unchanged = await reconcileStaleOpenLicenseInvoice(
        samePeriodPartner.id,
        stillSamePeriod,
        { tx: db }
      );
      expect(unchanged).toBeNull();
      const stillOpen = await listLicenseInvoicesForPartner(samePeriodPartner.id, db);
      expect(stillOpen.find((row) => row.id === openRenewal.id)?.status).toBe('pending');
      expect(Number(stillOpen.find((row) => row.id === openRenewal.id)?.amount)).toBe(
        PARTNER_LICENSE_INTRO_FEE
      );
    } finally {
      await client.close();
    }
  });
});
