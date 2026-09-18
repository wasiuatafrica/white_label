import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapPartnerLicenseInvoice } from '../mappers';
import { partnerLicenseInvoices } from '../schema/partner-license-invoices';
import { partners } from '../schema/partners';
import type { DbOrTx } from '../types';
import {
  addDays,
  computeNextPeriod,
  exemptLicenseCoverage,
  generateInvoiceNumber,
  isCalendarYmd,
  OVERDUE_GRACE_PERIOD_MS,
  shiftToCalendarDate,
  summarizeLicenseCoverage,
  type LicenseCoverageSummary,
} from '@/lib/partner-license-billing';
import { isUniqueViolation } from '@/lib/db-errors';
import {
  isLicenseRecurringExempt,
  PARTNER_LICENSE_FEE,
  PARTNER_LICENSE_PERIOD_DAYS,
  toMoneyNumber,
} from '@/lib/partner-pricing';

export class LicenseInvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LicenseInvoiceError';
  }
}

const OPEN_LICENSE_INVOICE_STATUSES = ['pending', 'overdue', 'receipt_uploaded'] as const;

function isOpenLicenseInvoiceStatus(
  status: string
): status is (typeof OPEN_LICENSE_INVOICE_STATUSES)[number] {
  return (OPEN_LICENSE_INVOICE_STATUSES as readonly string[]).includes(status);
}

/**
 * Creates the initial paid invoice when a partner is approved from pending -> active.
 * Idempotent: if the partner already has any invoice, it will not create a duplicate.
 */
export async function recordFirstActivationPaidInvoice(
  data: {
    partnerId: number;
    slug: string;
    paymentProofUrl?: string | null;
    activatedAt?: Date;
  },
  tx: DbOrTx = db
) {
  const existing = await tx
    .select({ id: partnerLicenseInvoices.id })
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.partnerId, data.partnerId))
    .limit(1);

  if (existing.length > 0) {
    return null;
  }

  const periodStart = data.activatedAt ?? new Date();
  const periodEnd = addDays(periodStart, PARTNER_LICENSE_PERIOD_DAYS);
  const invoiceNumber = generateInvoiceNumber(data.slug, periodStart);

  const [row] = await tx
    .insert(partnerLicenseInvoices)
    .values({
      partnerId: data.partnerId,
      invoiceNumber,
      amount: String(PARTNER_LICENSE_FEE),
      status: 'paid',
      periodStart,
      periodEnd,
      dueAt: periodStart,
      paymentProofUrl: data.paymentProofUrl ?? null,
      receiptUploadedAt: periodStart,
      paidAt: periodStart,
      verifiedAmount: String(PARTNER_LICENSE_FEE),
      verifiedBy: 'system/activation',
      verificationNote: 'First month license fee verified via partner application',
      createdAt: periodStart,
      updatedAt: periodStart,
    })
    .returning();

  await tx
    .update(partners)
    .set({
      monthlyFeePaid: true,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.id, data.partnerId));

  return mapPartnerLicenseInvoice(row);
}

export async function getLatestLicenseInvoiceForPartner(
  partnerId: number,
  tx: DbOrTx = db
): Promise<ReturnType<typeof mapPartnerLicenseInvoice> | null> {
  const [row] = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.partnerId, partnerId))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id))
    .limit(1);

  return row ? mapPartnerLicenseInvoice(row) : null;
}

export async function listLicenseInvoicesForPartner(
  partnerId: number,
  tx: DbOrTx = db
) {
  const rows = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.partnerId, partnerId))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id));

  return rows.map(mapPartnerLicenseInvoice);
}

export type AdminLicenseInvoiceRow = ReturnType<typeof mapPartnerLicenseInvoice> & {
  partner_slug: string;
  partner_firm_name: string;
  partner_owner_name: string | null;
  partner_owner_email: string;
  partner_status: string;
  partner_brand_color: string;
};

export async function listAllLicenseInvoices(tx: DbOrTx = db): Promise<AdminLicenseInvoiceRow[]> {
  const rows = await tx
    .select({
      invoice: partnerLicenseInvoices,
      partnerSlug: partners.slug,
      partnerFirmName: partners.firmName,
      partnerOwnerName: partners.ownerName,
      partnerOwnerEmail: partners.ownerEmail,
      partnerStatus: partners.status,
      partnerBrandColor: partners.brandColor,
    })
    .from(partnerLicenseInvoices)
    .innerJoin(partners, eq(partners.id, partnerLicenseInvoices.partnerId))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id));

  return rows.map((r) => ({
    ...mapPartnerLicenseInvoice(r.invoice),
    partner_slug: r.partnerSlug,
    partner_firm_name: r.partnerFirmName,
    partner_owner_name: r.partnerOwnerName,
    partner_owner_email: r.partnerOwnerEmail,
    partner_status: r.partnerStatus,
    partner_brand_color: r.partnerBrandColor,
  }));
}

export async function countPendingReviewLicenseInvoices(tx: DbOrTx = db): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.status, 'receipt_uploaded'));
  return row?.count ?? 0;
}

/**
 * Uploads payment proof for a partner's open invoice (pending or overdue).
 */
export async function uploadPartnerLicenseReceipt(
  data: {
    partnerId: number;
    invoiceId?: number;
    paymentProofUrl: string;
  },
  tx: DbOrTx = db
) {
  const [partner] = await tx
    .select({ slug: partners.slug })
    .from(partners)
    .where(eq(partners.id, data.partnerId))
    .limit(1);

  if (isLicenseRecurringExempt(partner?.slug)) {
    throw new LicenseInvoiceError('This partner is exempt from recurring license invoices');
  }

  let targetInvoiceId = data.invoiceId;

  if (!targetInvoiceId) {
    const [open] = await tx
      .select({ id: partnerLicenseInvoices.id })
      .from(partnerLicenseInvoices)
      .where(
        and(
          eq(partnerLicenseInvoices.partnerId, data.partnerId),
          inArray(partnerLicenseInvoices.status, ['pending', 'overdue'])
        )
      )
      .orderBy(desc(partnerLicenseInvoices.periodStart))
      .limit(1);

    if (!open) {
      throw new LicenseInvoiceError('No pending or overdue license invoice awaiting payment');
    }
    targetInvoiceId = open.id;
  }

  const [row] = await tx
    .update(partnerLicenseInvoices)
    .set({
      paymentProofUrl: data.paymentProofUrl,
      receiptUploadedAt: sql`NOW()`,
      status: 'receipt_uploaded',
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(partnerLicenseInvoices.id, targetInvoiceId),
        eq(partnerLicenseInvoices.partnerId, data.partnerId),
        inArray(partnerLicenseInvoices.status, ['pending', 'overdue', 'receipt_uploaded'])
      )
    )
    .returning();

  if (!row) {
    throw new LicenseInvoiceError('Invoice not found or cannot receive a receipt upload');
  }

  return mapPartnerLicenseInvoice(row);
}

/**
 * Reviews a license invoice (approve, reject, waive).
 */
export async function reviewLicenseInvoice(
  data: {
    invoiceId: number;
    action: 'approve' | 'reject' | 'waive';
    verifiedAmount?: number | string | null;
    forceApprove?: boolean;
    verificationNote?: string | null;
    reviewedBy?: string;
    periodStartDate?: string | null;
  },
  tx: DbOrTx = db
) {
  const [existing] = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.id, data.invoiceId))
    .limit(1);

  if (!existing) {
    throw new LicenseInvoiceError('License invoice not found');
  }

  if (data.action === 'reject') {
    const note = data.verificationNote?.trim();
    if (!note) {
      throw new LicenseInvoiceError('Verification note is required when rejecting a payment receipt');
    }

    const now = new Date();
    const isOverdue = now.getTime() >= existing.dueAt.getTime() + OVERDUE_GRACE_PERIOD_MS;
    const newStatus = isOverdue ? 'overdue' : 'pending';

    const [row] = await tx
      .update(partnerLicenseInvoices)
      .set({
        status: newStatus,
        paymentProofUrl: null,
        receiptUploadedAt: null,
        verificationNote: note,
        verifiedBy: data.reviewedBy ?? null,
        updatedAt: sql`NOW()`,
      })
      .where(eq(partnerLicenseInvoices.id, data.invoiceId))
      .returning();

    await syncPartnerMonthlyFeePaidFlag(existing.partnerId, now, tx);
    return { invoice: mapPartnerLicenseInvoice(row), partnerId: existing.partnerId };
  }

  if (data.action === 'waive') {
    const note = data.verificationNote?.trim();
    if (!note) {
      throw new LicenseInvoiceError('Verification note is required when waiving license fees');
    }

    const now = new Date();
    const [row] = await tx
      .update(partnerLicenseInvoices)
      .set({
        status: 'waived',
        paidAt: now,
        verificationNote: note,
        verifiedBy: data.reviewedBy ?? 'superadmin',
        updatedAt: sql`NOW()`,
      })
      .where(eq(partnerLicenseInvoices.id, data.invoiceId))
      .returning();

    await syncPartnerMonthlyFeePaidFlag(existing.partnerId, now, tx);
    return { invoice: mapPartnerLicenseInvoice(row), partnerId: existing.partnerId };
  }

  if (data.action === 'approve') {
    if (!isOpenLicenseInvoiceStatus(existing.status)) {
      throw new LicenseInvoiceError(
        'Only pending, overdue, or receipt-in-review invoices can be marked paid'
      );
    }

    const verified = toMoneyNumber(data.verifiedAmount ?? existing.amount);
    if (verified < PARTNER_LICENSE_FEE && !data.forceApprove) {
      throw new LicenseInvoiceError(
        `Verified amount (${verified}) is below required fee (₦${PARTNER_LICENSE_FEE.toLocaleString()}). Use forceApprove to override.`
      );
    }

    let periodStart = existing.periodStart;
    let periodEnd = existing.periodEnd;
    let dueAt = existing.dueAt;
    if (data.periodStartDate) {
      if (!isCalendarYmd(data.periodStartDate)) {
        throw new LicenseInvoiceError('Period start must be a valid YYYY-MM-DD date');
      }
      periodStart = shiftToCalendarDate(existing.periodStart, data.periodStartDate);
      periodEnd = addDays(periodStart, PARTNER_LICENSE_PERIOD_DAYS);
      dueAt = new Date(periodStart.getTime());
    }

    const datesChanged = periodStart.getTime() !== existing.periodStart.getTime();
    const hasReceipt = Boolean(existing.paymentProofUrl);
    const note = data.verificationNote?.trim() || '';
    if ((!hasReceipt || datesChanged) && !note) {
      throw new LicenseInvoiceError(
        datesChanged
          ? 'Verification note is required when changing the license period dates'
          : 'Verification note is required when marking paid without a receipt'
      );
    }

    const now = new Date();
    try {
      const [row] = await tx
        .update(partnerLicenseInvoices)
        .set({
          status: 'paid',
          paidAt: now,
          periodStart,
          periodEnd,
          dueAt,
          verifiedAmount: String(verified),
          verificationNote: note || null,
          verifiedBy: data.reviewedBy ?? 'superadmin',
          updatedAt: sql`NOW()`,
        })
        .where(eq(partnerLicenseInvoices.id, data.invoiceId))
        .returning();

      await syncPartnerMonthlyFeePaidFlag(existing.partnerId, now, tx);
      return { invoice: mapPartnerLicenseInvoice(row), partnerId: existing.partnerId };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LicenseInvoiceError(
          'Another invoice for this partner already uses that period start date'
        );
      }
      throw error;
    }
  }

  throw new LicenseInvoiceError(`Invalid action: ${String(data.action satisfies never)}`);
}

/**
 * Super Admin grant of a 30-day complimentary license:
 * 1. If an open invoice exists (pending, overdue, or receipt_uploaded), marks it waived.
 * 2. Otherwise creates a new waived invoice extending coverage by 30 days from latest periodEnd.
 */
export async function grantComplimentaryLicensePeriod(
  data: {
    partnerId: number;
    slug: string;
    reason: string;
    grantedBy?: string;
  },
  tx: DbOrTx = db
) {
  const note = data.reason.trim();
  if (!note) {
    throw new LicenseInvoiceError('Reason is required when granting a complimentary license period');
  }

  const now = new Date();

  // Check for an open invoice
  const [open] = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(
      and(
        eq(partnerLicenseInvoices.partnerId, data.partnerId),
        inArray(partnerLicenseInvoices.status, ['pending', 'overdue', 'receipt_uploaded'])
      )
    )
    .orderBy(desc(partnerLicenseInvoices.periodStart))
    .limit(1);

  if (open) {
    const [row] = await tx
      .update(partnerLicenseInvoices)
      .set({
        status: 'waived',
        paidAt: now,
        verificationNote: note,
        verifiedBy: data.grantedBy ?? 'superadmin',
        updatedAt: sql`NOW()`,
      })
      .where(eq(partnerLicenseInvoices.id, open.id))
      .returning();

    await syncPartnerMonthlyFeePaidFlag(data.partnerId, now, tx);
    return mapPartnerLicenseInvoice(row);
  }

  // Otherwise find latest invoice to attach next 30-day period
  const latest = await getLatestLicenseInvoiceForPartner(data.partnerId, tx);
  const periodStart = latest?.period_end ? new Date(latest.period_end) : now;
  const periodEnd = addDays(periodStart, PARTNER_LICENSE_PERIOD_DAYS);
  const invoiceNumber = generateInvoiceNumber(data.slug, periodStart);

  const [row] = await tx
    .insert(partnerLicenseInvoices)
    .values({
      partnerId: data.partnerId,
      invoiceNumber,
      amount: String(PARTNER_LICENSE_FEE),
      status: 'waived',
      periodStart,
      periodEnd,
      dueAt: periodStart,
      paidAt: now,
      verifiedAmount: '0.00',
      verifiedBy: data.grantedBy ?? 'superadmin',
      verificationNote: note,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await syncPartnerMonthlyFeePaidFlag(data.partnerId, now, tx);
  return mapPartnerLicenseInvoice(row);
}

/**
 * Calculates current coverage status for a partner.
 */
export async function getPartnerLicenseCoverage(
  partnerId: number,
  now: Date = new Date(),
  tx: DbOrTx = db
): Promise<LicenseCoverageSummary & { latestInvoice: ReturnType<typeof mapPartnerLicenseInvoice> | null }> {
  const [partner] = await tx
    .select({ slug: partners.slug })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);

  const latest = await getLatestLicenseInvoiceForPartner(partnerId, tx);
  if (isLicenseRecurringExempt(partner?.slug)) {
    return {
      ...exemptLicenseCoverage(),
      latestInvoice: latest,
    };
  }

  if (!latest) {
    return {
      ...summarizeLicenseCoverage(null, now),
      latestInvoice: null,
    };
  }

  return {
    ...summarizeLicenseCoverage(
      {
        status: latest.status,
        periodStart: latest.period_start,
        periodEnd: latest.period_end,
        dueAt: latest.due_at,
      },
      now
    ),
    latestInvoice: latest,
  };
}

/**
 * Batch coverage for partners list.
 */
export async function getBatchPartnerLicenseCoverage(
  partnerIds: number[],
  now: Date = new Date(),
  tx: DbOrTx = db
): Promise<Map<number, LicenseCoverageSummary & { latestInvoice: ReturnType<typeof mapPartnerLicenseInvoice> | null }>> {
  const result = new Map<
    number,
    LicenseCoverageSummary & { latestInvoice: ReturnType<typeof mapPartnerLicenseInvoice> | null }
  >();

  if (partnerIds.length === 0) return result;

  const slugRows = await tx
    .select({ id: partners.id, slug: partners.slug })
    .from(partners)
    .where(inArray(partners.id, partnerIds));
  const slugByPartner = new Map(slugRows.map((row) => [row.id, row.slug]));

  const rows = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(inArray(partnerLicenseInvoices.partnerId, partnerIds))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id));

  // Keep first (latest) row per partnerId
  const latestByPartner = new Map<number, (typeof rows)[0]>();
  for (const r of rows) {
    if (!latestByPartner.has(r.partnerId)) {
      latestByPartner.set(r.partnerId, r);
    }
  }

  for (const pid of partnerIds) {
    const raw = latestByPartner.get(pid);
    const mapped = raw ? mapPartnerLicenseInvoice(raw) : null;
    if (isLicenseRecurringExempt(slugByPartner.get(pid))) {
      result.set(pid, {
        ...exemptLicenseCoverage(),
        latestInvoice: mapped,
      });
      continue;
    }

    if (!raw) {
      result.set(pid, {
        ...summarizeLicenseCoverage(null, now),
        latestInvoice: null,
      });
      continue;
    }

    result.set(pid, {
      ...summarizeLicenseCoverage(
        {
          status: raw.status,
          periodStart: raw.periodStart,
          periodEnd: raw.periodEnd,
          dueAt: raw.dueAt,
        },
        now
      ),
      latestInvoice: mapped,
    });
  }

  return result;
}

/**
 * Synchronizes the partners.monthly_fee_paid boolean flag with actual coverage today.
 */
export async function syncPartnerMonthlyFeePaidFlag(
  partnerId: number,
  now: Date = new Date(),
  tx: DbOrTx = db
) {
  const coverage = await getPartnerLicenseCoverage(partnerId, now, tx);
  await tx
    .update(partners)
    .set({
      monthlyFeePaid: coverage.isCovered,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.id, partnerId));

  return coverage.isCovered;
}

// ── Cron / on-demand renewal helpers ──────────────────────────────────────────

export type PartnerRenewalRef = {
  id: number;
  slug: string;
  firmName: string;
  ownerName: string | null;
  ownerEmail: string;
};

export type RenewalInvoiceIssue = {
  partner: PartnerRenewalRef;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  invoiceNumber: string;
};

function computeRenewalIssue(
  partner: PartnerRenewalRef,
  invoices: Array<{ periodStart: Date; periodEnd: Date }>,
  now: Date,
  bootstrapIfMissing: boolean
): RenewalInvoiceIssue | null {
  if (invoices.length === 0) {
    if (!bootstrapIfMissing) return null;
    const periodStart = now;
    const periodEnd = addDays(periodStart, PARTNER_LICENSE_PERIOD_DAYS);
    return {
      partner,
      periodStart,
      periodEnd,
      dueAt: periodStart,
      invoiceNumber: generateInvoiceNumber(partner.slug, periodStart),
    };
  }

  const latest = invoices[0];
  if (now.getTime() < latest.periodEnd.getTime()) return null;

  const nextPeriod = computeNextPeriod(latest.periodEnd);
  const exists = invoices.some(
    (inv) => inv.periodStart.getTime() === nextPeriod.periodStart.getTime()
  );
  if (exists) return null;

  return {
    partner,
    ...nextPeriod,
    invoiceNumber: generateInvoiceNumber(partner.slug, nextPeriod.periodStart),
  };
}

/**
 * Finds active partners whose current/latest invoice period has ended and who do not
 * yet have an invoice starting at that periodEnd.
 */
export async function findPartnersNeedingRenewalInvoice(now: Date = new Date(), tx: DbOrTx = db) {
  const activePartners = await tx
    .select({
      id: partners.id,
      slug: partners.slug,
      firmName: partners.firmName,
      ownerName: partners.ownerName,
      ownerEmail: partners.ownerEmail,
    })
    .from(partners)
    .where(eq(partners.status, 'active'));

  if (activePartners.length === 0) return [];

  const partnerIds = activePartners.map((p) => p.id);
  const invoices = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(inArray(partnerLicenseInvoices.partnerId, partnerIds))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id));

  const invoicesByPartner = new Map<number, typeof invoices>();
  for (const inv of invoices) {
    const list = invoicesByPartner.get(inv.partnerId) ?? [];
    list.push(inv);
    invoicesByPartner.set(inv.partnerId, list);
  }

  const partnersToRenew: RenewalInvoiceIssue[] = [];
  for (const partner of activePartners) {
    if (isLicenseRecurringExempt(partner.slug)) continue;
    const issue = computeRenewalIssue(
      partner,
      invoicesByPartner.get(partner.id) ?? [],
      now,
      true
    );
    if (issue) partnersToRenew.push(issue);
  }

  return partnersToRenew;
}

/**
 * Next 30-day invoice for a single partner, if their latest period has ended.
 * Used when they open admin before the daily cron runs.
 */
export async function findPartnerNeedingRenewalInvoice(
  partnerId: number,
  now: Date = new Date(),
  options: { allowSuspended?: boolean; tx?: DbOrTx } = {}
): Promise<RenewalInvoiceIssue | null> {
  const tx = options.tx ?? db;
  const [partner] = await tx
    .select({
      id: partners.id,
      slug: partners.slug,
      firmName: partners.firmName,
      ownerName: partners.ownerName,
      ownerEmail: partners.ownerEmail,
      status: partners.status,
    })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);

  if (!partner) return null;
  if (isLicenseRecurringExempt(partner.slug)) return null;

  switch (partner.status) {
    case 'pending':
      return null;
    case 'suspended':
      if (!options.allowSuspended) return null;
      break;
    case 'active':
      break;
    default: {
      const _exhaustive: never = partner.status;
      return _exhaustive;
    }
  }

  const invoices = await tx
    .select()
    .from(partnerLicenseInvoices)
    .where(eq(partnerLicenseInvoices.partnerId, partnerId))
    .orderBy(desc(partnerLicenseInvoices.periodStart), desc(partnerLicenseInvoices.id));

  return computeRenewalIssue(
    {
      id: partner.id,
      slug: partner.slug,
      firmName: partner.firmName,
      ownerName: partner.ownerName,
      ownerEmail: partner.ownerEmail,
    },
    invoices,
    now,
    false
  );
}

export async function createRenewalInvoice(
  data: {
    partnerId: number;
    slug: string;
    periodStart: Date;
    periodEnd: Date;
    dueAt: Date;
    invoiceNumber: string;
  },
  tx: DbOrTx = db
) {
  const inserted = await tx
    .insert(partnerLicenseInvoices)
    .values({
      partnerId: data.partnerId,
      invoiceNumber: data.invoiceNumber,
      amount: String(PARTNER_LICENSE_FEE),
      status: 'pending',
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      dueAt: data.dueAt,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .onConflictDoNothing({
      target: [partnerLicenseInvoices.partnerId, partnerLicenseInvoices.periodStart],
    })
    .returning();

  const row =
    inserted[0] ??
    (
      await tx
        .select()
        .from(partnerLicenseInvoices)
        .where(
          and(
            eq(partnerLicenseInvoices.partnerId, data.partnerId),
            eq(partnerLicenseInvoices.periodStart, data.periodStart)
          )
        )
        .limit(1)
    )[0];

  if (!row) {
    throw new LicenseInvoiceError('Failed to create or load renewal invoice');
  }

  if (inserted[0]) {
    await tx
      .update(partners)
      .set({
        monthlyFeePaid: false,
        updatedAt: sql`NOW()`,
      })
      .where(eq(partners.id, data.partnerId));
  }

  return mapPartnerLicenseInvoice(row);
}

/**
 * Finds invoices that are >= 7 days overdue, have no receipt uploaded, and have not yet been sent an overdue notice.
 */
export async function findInvoicesNeedingOverdueNotice(now: Date = new Date(), tx: DbOrTx = db) {
  const rows = await tx
    .select({
      invoice: partnerLicenseInvoices,
      partnerSlug: partners.slug,
      partnerFirmName: partners.firmName,
      partnerOwnerName: partners.ownerName,
      partnerOwnerEmail: partners.ownerEmail,
      partnerStatus: partners.status,
    })
    .from(partnerLicenseInvoices)
    .innerJoin(partners, eq(partners.id, partnerLicenseInvoices.partnerId))
    .where(
      and(
        inArray(partnerLicenseInvoices.status, ['pending', 'overdue']),
        isNull(partnerLicenseInvoices.paymentProofUrl),
        isNull(partnerLicenseInvoices.receiptUploadedAt),
        isNull(partnerLicenseInvoices.overdueEmailSentAt),
        sql`${partnerLicenseInvoices.dueAt} + INTERVAL '7 days' <= ${now}`
      )
    );

  return rows
    .filter((r) => !isLicenseRecurringExempt(r.partnerSlug))
    .map((r) => ({
      ...mapPartnerLicenseInvoice(r.invoice),
      partner_slug: r.partnerSlug,
      partner_firm_name: r.partnerFirmName,
      partner_owner_name: r.partnerOwnerName,
      partner_owner_email: r.partnerOwnerEmail,
      partner_status: r.partnerStatus,
    }));
}

export async function markInvoiceOverdue(invoiceId: number, tx: DbOrTx = db) {
  await tx
    .update(partnerLicenseInvoices)
    .set({
      status: 'overdue',
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(partnerLicenseInvoices.id, invoiceId),
        eq(partnerLicenseInvoices.status, 'pending')
      )
    );
}

export async function markInvoiceEmailSent(invoiceId: number, tx: DbOrTx = db) {
  await tx
    .update(partnerLicenseInvoices)
    .set({
      invoiceEmailSentAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partnerLicenseInvoices.id, invoiceId));
}

export async function markOverdueEmailSent(invoiceId: number, tx: DbOrTx = db) {
  await tx
    .update(partnerLicenseInvoices)
    .set({
      status: 'overdue',
      overdueEmailSentAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partnerLicenseInvoices.id, invoiceId));
}
