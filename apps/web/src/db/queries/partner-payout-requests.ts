import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapPartnerPayoutRequest } from '../mappers';
import { evaluations } from '../schema/evaluations';
import { partnerPayoutRequests } from '../schema/partner-payout-requests';
import type { DbOrTx } from '../types';

const RESERVED_PAYOUT_STATUSES = ['pending', 'approved', 'paid'] as const;

export async function listPartnerPayoutRequests(partnerId: number) {
  const rows = await db
    .select()
    .from(partnerPayoutRequests)
    .where(eq(partnerPayoutRequests.partnerId, partnerId))
    .orderBy(desc(partnerPayoutRequests.createdAt));
  return rows.map(mapPartnerPayoutRequest);
}

export async function listAllPartnerPayoutRequests() {
  const rows = await db
    .select()
    .from(partnerPayoutRequests)
    .orderBy(desc(partnerPayoutRequests.createdAt));
  return rows.map(mapPartnerPayoutRequest);
}

export async function findPendingPartnerPayoutRequest(partnerId: number, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ id: partnerPayoutRequests.id })
    .from(partnerPayoutRequests)
    .where(
      and(
        eq(partnerPayoutRequests.partnerId, partnerId),
        eq(partnerPayoutRequests.status, 'pending')
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getPartnerTotalEarnings(partnerId: number, tx: DbOrTx = db): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${evaluations.partnerEarningsAmount}), 0)`,
    })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.partnerId, partnerId),
        sql`${evaluations.verifiedAmount} IS NOT NULL`,
        sql`${evaluations.status} NOT IN ('pending_payment', 'payment_rejected')`
      )
    );
  return parseFloat(row?.total || '0');
}

export async function getPartnerReservedPayoutTotal(partnerId: number, tx: DbOrTx = db): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${partnerPayoutRequests.amountRequested}), 0)`,
    })
    .from(partnerPayoutRequests)
    .where(
      and(
        eq(partnerPayoutRequests.partnerId, partnerId),
        inArray(partnerPayoutRequests.status, [...RESERVED_PAYOUT_STATUSES])
      )
    );
  return parseFloat(row?.total || '0');
}

export async function getPartnerAvailableBalance(partnerId: number, tx: DbOrTx = db): Promise<number> {
  const [earnings, reserved] = await Promise.all([
    getPartnerTotalEarnings(partnerId, tx),
    getPartnerReservedPayoutTotal(partnerId, tx),
  ]);
  return Math.max(earnings - reserved, 0);
}

export async function createPartnerPayoutRequest(data: {
  partnerId: number;
  amountRequested: string | number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string | null;
}) {
  return db.transaction(async (tx) => {
    const existing = await findPendingPartnerPayoutRequest(data.partnerId, tx);
    if (existing) {
      throw new Error('You already have a pending payout request. Please wait for it to be processed.');
    }

    const available = await getPartnerAvailableBalance(data.partnerId, tx);
    const requested = parseFloat(String(data.amountRequested));
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new Error('amount_requested must be greater than zero');
    }
    if (requested > available) {
      throw new Error('Requested amount exceeds available balance');
    }

    const [row] = await tx
      .insert(partnerPayoutRequests)
      .values({
        partnerId: data.partnerId,
        amountRequested: String(data.amountRequested),
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        notes: data.notes ?? null,
        status: 'pending',
      })
      .returning();
    return mapPartnerPayoutRequest(row);
  });
}

export async function updatePartnerPayoutRequest(
  requestId: number,
  status: 'approved' | 'rejected' | 'paid',
  adminNotes?: string | null
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(partnerPayoutRequests)
      .where(eq(partnerPayoutRequests.id, requestId))
      .limit(1);
    if (!existing) return null;

    if (status === 'approved' || status === 'paid') {
      const available = await getPartnerAvailableBalance(existing.partnerId, tx);
      const requested = parseFloat(existing.amountRequested);
      const alreadyReserved =
        existing.status === 'approved' || existing.status === 'paid' || existing.status === 'pending'
          ? requested
          : 0;
      const effectiveAvailable = available + alreadyReserved;
      if (requested > effectiveAvailable) {
        throw new Error('Payout amount exceeds partner available balance');
      }
    }

    const [row] = await tx
      .update(partnerPayoutRequests)
      .set({
        status,
        adminNotes: adminNotes ?? existing.adminNotes,
        updatedAt: sql`NOW()`,
        processedAt: status === 'paid' ? sql`NOW()` : existing.processedAt,
      })
      .where(eq(partnerPayoutRequests.id, requestId))
      .returning();
    return row ? mapPartnerPayoutRequest(row) : null;
  });
}

export async function getPartnerPayoutRequestById(requestId: number) {
  const [row] = await db
    .select()
    .from(partnerPayoutRequests)
    .where(eq(partnerPayoutRequests.id, requestId))
    .limit(1);
  return row ? mapPartnerPayoutRequest(row) : null;
}
