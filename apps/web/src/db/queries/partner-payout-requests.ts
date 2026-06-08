import { and, desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { mapPartnerPayoutRequest } from '../mappers';
import { partnerPayoutRequests } from '../schema/partner-payout-requests';

export async function listPartnerPayoutRequests(partnerId: number) {
  const rows = await db
    .select()
    .from(partnerPayoutRequests)
    .where(eq(partnerPayoutRequests.partnerId, partnerId))
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

export async function createPartnerPayoutRequest(data: {
  partnerId: number;
  amountRequested: string | number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string | null;
}) {
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
