import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapTraderRequest } from '../mappers';
import { evaluations } from '../schema/evaluations';
import { traderRequests } from '../schema/trader-requests';

export async function listTraderRequests(traderId: number) {
  return db
    .select({
      id: traderRequests.id,
      eval_id: traderRequests.evalId,
      request_type: traderRequests.requestType,
      status: traderRequests.status,
      notes: traderRequests.notes,
      admin_notes: traderRequests.adminNotes,
      created_at: traderRequests.createdAt,
      updated_at: traderRequests.updatedAt,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      eval_status: evaluations.status,
    })
    .from(traderRequests)
    .innerJoin(evaluations, eq(evaluations.id, traderRequests.evalId))
    .where(eq(traderRequests.traderId, traderId))
    .orderBy(desc(traderRequests.createdAt));
}

export async function findDuplicateTraderRequest(
  evalId: number,
  requestType: 'talent_bonus' | 'aso_payout_ssl' | 'aso_account'
) {
  const [row] = await db
    .select({ id: traderRequests.id })
    .from(traderRequests)
    .where(
      and(
        eq(traderRequests.evalId, evalId),
        eq(traderRequests.requestType, requestType),
        inArray(traderRequests.status, ['pending', 'approved'])
      )
    )
    .limit(1);
  return row ?? null;
}

export async function createTraderRequest(data: {
  traderId: number;
  partnerId: number;
  evalId: number;
  requestType: 'talent_bonus' | 'aso_payout_ssl' | 'aso_account';
  notes?: string | null;
}) {
  const [row] = await db
    .insert(traderRequests)
    .values({
      traderId: data.traderId,
      partnerId: data.partnerId,
      evalId: data.evalId,
      requestType: data.requestType,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .returning();
  return mapTraderRequest(row);
}

export async function updateTraderRequest(
  requestId: number,
  status: 'approved' | 'rejected',
  adminNotes?: string | null
) {
  const [row] = await db
    .update(traderRequests)
    .set({
      status,
      adminNotes: adminNotes ?? null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(traderRequests.id, requestId))
    .returning({ id: traderRequests.id });
  return row ?? null;
}
