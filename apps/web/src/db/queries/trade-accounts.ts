import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../index';
import type { DbOrTx } from '../types';
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
    time_to_aso: row.timeToAso,
    profit_target: row.profitTarget,
    creation_code: row.creationCode,
    blown: row.blown,
    inactive: row.inactive,
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
        eq(tradeAccounts.creationCode, data.creationCode)
      )
    )
    .returning();
  return row ? mapTradeAccount(row) : null;
}
