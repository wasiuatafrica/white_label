import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '../index';
import type { DbOrTx } from '../types';
import { evaluations } from '../schema/evaluations';
import { tradeAccounts } from '../schema/trade-accounts';

function generateCreationCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function mapTradeAccount(row: typeof tradeAccounts.$inferSelect) {
  return {
    id: row.id,
    trader_id: row.traderId,
    partner_id: row.partnerId,
    evaluation_id: row.evaluationId,
    number: row.number,
    password: row.password,
    investor_password: row.investorPassword,
    platform: row.platform,
    typeofaccount: row.typeOfAccount,
    broker: row.broker,
    acc_size: row.accSize,
    payout: row.payout,
    has_aso: row.hasAso,
    aso_account_id: row.asoAccountId,
    aso_source_account_id: row.asoSourceAccountId,
    aso_account_number: row.asoAccountNumber,
    time_to_aso: row.timeToAso,
    profit_target: row.profitTarget,
    creation_code: row.creationCode,
    blown: row.blown,
    blown_reason: row.blownReason,
    blown_drawdown: row.blownDrawdown,
    blown_at: row.blownAt,
    inactive: row.inactive,
    inactive_at: row.inactiveAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    is_completed: row.number > 0 && Boolean(row.password) && Boolean(row.investorPassword),
  };
}

export async function createTradeAccountActivation(
  data: {
    traderId: number;
    partnerId: number;
    evaluationId: number;
    evalType: 'SS' | 'SSL';
    profitTarget: string;
  },
  tx: DbOrTx = db
) {
  const [existing] = await tx
    .select()
    .from(tradeAccounts)
    .where(eq(tradeAccounts.evaluationId, data.evaluationId))
    .limit(1);
  if (existing) return mapTradeAccount(existing);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [row] = await tx
      .insert(tradeAccounts)
      .values({
        traderId: data.traderId,
        partnerId: data.partnerId,
        evaluationId: data.evaluationId,
        typeOfAccount: data.evalType === 'SSL' ? 'Synthetic-Signals-Lite' : 'Synthetic-Signals',
        accSize: '$10,000',
        profitTarget: data.profitTarget,
        creationCode: generateCreationCode(),
      })
      .onConflictDoNothing({ target: tradeAccounts.creationCode })
      .returning();
    if (row) return mapTradeAccount(row);
  }

  throw new Error('Unable to generate a unique account activation code');
}

export async function listTradeAccountsByTrader(traderId: number, partnerId: number) {
  const rows = await db
    .select()
    .from(tradeAccounts)
    .where(and(eq(tradeAccounts.traderId, traderId), eq(tradeAccounts.partnerId, partnerId)))
    .orderBy(sql`${tradeAccounts.createdAt} DESC`);
  return rows.map(mapTradeAccount);
}

export async function completeTradeAccount(data: {
  traderId: number;
  partnerId: number;
  evaluationId: number;
  creationCode: string;
  number: number;
  password: string;
  investorPassword: string;
}) {
  const [row] = await db
    .update(tradeAccounts)
    .set({
      number: data.number,
      password: data.password,
      investorPassword: data.investorPassword,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(tradeAccounts.traderId, data.traderId),
        eq(tradeAccounts.partnerId, data.partnerId),
        eq(tradeAccounts.evaluationId, data.evaluationId),
        eq(tradeAccounts.creationCode, data.creationCode),
        eq(tradeAccounts.number, 0),
        eq(tradeAccounts.password, ''),
        eq(tradeAccounts.investorPassword, '')
      )
    )
    .returning();
  return row ? mapTradeAccount(row) : null;
}

export async function createAsoTradeAccount(
  data: {
    traderId: number;
    partnerId: number;
    ssAccountId: number;
    number: number;
    password: string;
    investorPassword: string;
  },
  tx: DbOrTx = db
) {
  const [existingSource] = await tx
    .select({ id: tradeAccounts.id })
    .from(tradeAccounts)
    .where(eq(tradeAccounts.asoSourceAccountId, data.ssAccountId))
    .limit(1);
  if (existingSource) return null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [aso] = await tx
      .insert(tradeAccounts)
      .values({
        traderId: data.traderId,
        partnerId: data.partnerId,
        evaluationId: null,
        number: data.number,
        password: data.password,
        investorPassword: data.investorPassword,
        typeOfAccount: 'Aso',
        accSize: '$10,000',
        profitTarget: null,
        hasAso: null,
        asoSourceAccountId: data.ssAccountId,
        asoAccountNumber: data.number,
        creationCode: generateCreationCode(),
      })
      .onConflictDoNothing({ target: tradeAccounts.creationCode })
      .returning();

    if (!aso) continue;

    await tx
      .update(tradeAccounts)
      .set({
        hasAso: 1,
        asoAccountId: aso.id,
        asoAccountNumber: aso.number,
        updatedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(tradeAccounts.id, data.ssAccountId),
          eq(tradeAccounts.traderId, data.traderId),
          eq(tradeAccounts.partnerId, data.partnerId)
        )
      );

    return mapTradeAccount(aso);
  }

  throw new Error('Unable to generate a unique ASO account creation code');
}

/**
 * Accounts the drawdown and inactivity crons check: not blown or inactive, has an MT5 number,
 * not already upgraded to ASO, and either an ASO account or tied to an active evaluation.
 */
export async function listMonitoredTradeAccounts() {
  return db
    .select({ id: tradeAccounts.id, number: tradeAccounts.number })
    .from(tradeAccounts)
    .leftJoin(evaluations, eq(evaluations.id, tradeAccounts.evaluationId))
    .where(
      and(
        eq(tradeAccounts.blown, false),
        eq(tradeAccounts.inactive, false),
        gt(tradeAccounts.number, 0),
        isNull(tradeAccounts.hasAso),
        or(isNull(tradeAccounts.evaluationId), eq(evaluations.status, 'active'))
      )
    );
}

/** Returns false when the account was already blown (so callers only act once). */
export async function markTradeAccountBlown(
  tradeAccountId: number,
  reason: 'daily_drawdown' | 'account_drawdown',
  drawdownPercent: number
) {
  const now = new Date();
  const [row] = await db
    .update(tradeAccounts)
    .set({
      blown: true,
      blownReason: reason,
      blownDrawdown: drawdownPercent.toFixed(2),
      blownAt: now,
      updatedAt: now,
    })
    .where(and(eq(tradeAccounts.id, tradeAccountId), eq(tradeAccounts.blown, false)))
    .returning({ id: tradeAccounts.id });
  return Boolean(row);
}

/** Returns false when the account was already inactive. */
export async function markTradeAccountInactive(tradeAccountId: number) {
  const now = new Date();
  const [row] = await db
    .update(tradeAccounts)
    .set({ inactive: true, inactiveAt: now, updatedAt: now })
    .where(and(eq(tradeAccounts.id, tradeAccountId), eq(tradeAccounts.inactive, false)))
    .returning({ id: tradeAccounts.id });
  return Boolean(row);
}
