import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapPartnerPayoutRequest } from '../mappers';
import { evaluations } from '../schema/evaluations';
import { partnerPayoutRequests } from '../schema/partner-payout-requests';

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

export async function findPendingPartnerPayoutRequest(partnerId: number) {
  const [row] = await db
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

export async function getPartnerTotalEarnings(partnerId: number): Promise<number> {
  const [row] = await db
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

export async function getPartnerReservedPayoutTotal(partnerId: number): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${partnerPayoutRequests.amountRequested}), 0)`,
    })
    .from(partnerPayoutRequests)
    .where(
      and(
        eq(partnerPayoutRequests.partnerId, partnerId),
        inArray(partnerPayoutRequests.status, ['approved', 'paid'])
      )
    );
  return parseFloat(row?.total || '0');
}

export async function getPartnerAvailableBalance(partnerId: number): Promise<number> {
  const [earnings, reserved] = await Promise.all([
    getPartnerTotalEarnings(partnerId),
    getPartnerReservedPayoutTotal(partnerId),
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
  const available = await getPartnerAvailableBalance(data.partnerId);
  const requested = parseFloat(String(data.amountRequested));
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new Error('amount_requested must be greater than zero');
  }
  if (requested > available) {
    throw new Error('Requested amount exceeds available balance');
  }

  const [row] = await db
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
}

export async function updatePartnerPayoutRequest(
  requestId: number,
  status: 'approved' | 'rejected' | 'paid',
  adminNotes?: string | null
) {
  const [existing] = await db
    .select()
    .from(partnerPayoutRequests)
    .where(eq(partnerPayoutRequests.id, requestId))
    .limit(1);
  if (!existing) return null;

  if (status === 'approved' || status === 'paid') {
    const available = await getPartnerAvailableBalance(existing.partnerId);
    const requested = parseFloat(existing.amountRequested);
    const alreadyReserved =
      existing.status === 'approved' || existing.status === 'paid' ? requested : 0;
    const effectiveAvailable = available + alreadyReserved;
    if (requested > effectiveAvailable) {
      throw new Error('Payout amount exceeds partner available balance');
    }
  }

  const [row] = await db
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
}

export async function getPartnerPayoutRequestById(requestId: number) {
  const [row] = await db
    .select()
    .from(partnerPayoutRequests)
    .where(eq(partnerPayoutRequests.id, requestId))
    .limit(1);
  return row ? mapPartnerPayoutRequest(row) : null;
}
