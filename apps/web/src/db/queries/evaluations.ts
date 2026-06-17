import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapEvaluation } from '../mappers';
import { evaluations } from '../schema/evaluations';
import { tradeAccounts } from '../schema/trade-accounts';
import { traders } from '../schema/traders';
import {
  getTradingTelemetryMetrics,
  TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
  TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
  TRADING_PROFIT_TARGET_PERCENT,
  TRADING_REQUIRED_DAYS,
} from '@/lib/trading-telemetry';
import { incrementPartnerRevenue, incrementPartnerTraders } from './partners';
import { createTrader, getTraderByEmail } from './traders';
import { createTradeAccountActivation } from './trade-accounts';

const evaluationColumns = {
  id: evaluations.id,
  trader_id: evaluations.traderId,
  partner_id: evaluations.partnerId,
  eval_type: evaluations.evalType,
  amount: evaluations.amount,
  payment_method: evaluations.paymentMethod,
  payment_proof_url: evaluations.paymentProofUrl,
  status: evaluations.status,
  profit_target: evaluations.profitTarget,
  current_profit: evaluations.currentProfit,
  max_drawdown: evaluations.maxDrawdown,
  current_drawdown: evaluations.currentDrawdown,
  trading_days: evaluations.tradingDays,
  required_days: evaluations.requiredDays,
  payout_status: evaluations.payoutStatus,
  purchase_date: evaluations.purchaseDate,
  updated_at: evaluations.updatedAt,
};

export async function listEvaluationsByPartnerId(partnerId: number) {
  return db
    .select({
      ...evaluationColumns,
      trader_name: traders.name,
      trader_email: traders.email,
      account_creation_code: tradeAccounts.creationCode,
      trade_account_id: tradeAccounts.id,
      trade_account_number: tradeAccounts.number,
      trade_account_platform: tradeAccounts.platform,
      trade_account_broker: tradeAccounts.broker,
      trade_account_has_aso: tradeAccounts.hasAso,
      trade_account_aso_account_id: tradeAccounts.asoAccountId,
      trade_account_aso_account_number: tradeAccounts.asoAccountNumber,
      trade_account_completed: sql<boolean>`CASE WHEN ${tradeAccounts.number} > 0 AND ${tradeAccounts.password} <> '' AND ${tradeAccounts.investorPassword} <> '' THEN true ELSE false END`,
    })
    .from(evaluations)
    .innerJoin(traders, eq(traders.id, evaluations.traderId))
    .leftJoin(tradeAccounts, eq(tradeAccounts.evaluationId, evaluations.id))
    .where(eq(evaluations.partnerId, partnerId))
    .orderBy(desc(evaluations.purchaseDate));
}

export async function listEvaluationsByTrader(partnerId: number, traderId: number) {
  const rows = await db
    .select({
      id: evaluations.id,
      traderId: evaluations.traderId,
      partnerId: evaluations.partnerId,
      evalType: evaluations.evalType,
      amount: evaluations.amount,
      paymentMethod: evaluations.paymentMethod,
      paymentProofUrl: evaluations.paymentProofUrl,
      status: evaluations.status,
      profitTarget: evaluations.profitTarget,
      currentProfit: evaluations.currentProfit,
      maxDrawdown: evaluations.maxDrawdown,
      currentDrawdown: evaluations.currentDrawdown,
      tradingDays: evaluations.tradingDays,
      requiredDays: evaluations.requiredDays,
      payoutStatus: evaluations.payoutStatus,
      purchaseDate: evaluations.purchaseDate,
      updatedAt: evaluations.updatedAt,
      account_creation_code: tradeAccounts.creationCode,
      trade_account_id: tradeAccounts.id,
      trade_account_number: tradeAccounts.number,
      trade_account_platform: tradeAccounts.platform,
      trade_account_broker: tradeAccounts.broker,
      trade_account_has_aso: tradeAccounts.hasAso,
      trade_account_aso_account_id: tradeAccounts.asoAccountId,
      trade_account_aso_account_number: tradeAccounts.asoAccountNumber,
      trade_account_completed: sql<boolean>`CASE WHEN ${tradeAccounts.number} > 0 AND ${tradeAccounts.password} <> '' AND ${tradeAccounts.investorPassword} <> '' THEN true ELSE false END`,
    })
    .from(evaluations)
    .leftJoin(tradeAccounts, eq(tradeAccounts.evaluationId, evaluations.id))
    .where(and(eq(evaluations.traderId, traderId), eq(evaluations.partnerId, partnerId)))
    .orderBy(desc(evaluations.purchaseDate));
  const enrichedRows = await Promise.all(
    rows.map(async (row) => {
      let telemetry: Awaited<ReturnType<typeof getTradingTelemetryMetrics>> = null;
      if (row.trade_account_number) {
        try {
          telemetry = await getTradingTelemetryMetrics(Number(row.trade_account_number));
        } catch (error) {
          console.error('Failed to load trading telemetry', {
            accountNumber: row.trade_account_number,
            error,
          });
        }
      }
      const evaluation = mapEvaluation(row);

      return {
        ...evaluation,
        profit_target: telemetry?.profit_target ?? TRADING_PROFIT_TARGET_PERCENT,
        current_profit: telemetry?.current_profit ?? Number(evaluation.current_profit),
        max_drawdown:
          telemetry?.max_account_drawdown ?? TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
        current_drawdown:
          telemetry?.account_drawdown ?? Number(evaluation.current_drawdown),
        trading_days: telemetry?.trading_days ?? evaluation.trading_days,
        required_days: telemetry?.required_days ?? TRADING_REQUIRED_DAYS,
        daily_drawdown: telemetry?.daily_drawdown ?? 0,
        max_daily_drawdown:
          telemetry?.max_daily_drawdown ?? TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
        latest_balance: telemetry?.latest_balance ?? null,
        latest_equity: telemetry?.latest_equity ?? null,
        telemetry,
        account_creation_code: row.account_creation_code,
        trade_account_id: row.trade_account_id,
        trade_account_number: row.trade_account_number,
        trade_account_platform: row.trade_account_platform,
        trade_account_broker: row.trade_account_broker,
        trade_account_has_aso: row.trade_account_has_aso,
        trade_account_aso_account_id: row.trade_account_aso_account_id,
        trade_account_aso_account_number: row.trade_account_aso_account_number,
        trade_account_completed: row.trade_account_completed,
      };
    })
  );

  return enrichedRows;
}

export async function getEvaluationForTrader(
  evalId: number,
  traderId: number,
  partnerId: number
) {
  const [row] = await db
    .select({
      id: evaluations.id,
      eval_type: evaluations.evalType,
      status: evaluations.status,
    })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.id, evalId),
        eq(evaluations.traderId, traderId),
        eq(evaluations.partnerId, partnerId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getActiveEvaluationForTradeAccount(
  evaluationId: number,
  traderId: number,
  partnerId: number
) {
  const [row] = await db
    .select({ id: evaluations.id })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.id, evaluationId),
        eq(evaluations.traderId, traderId),
        eq(evaluations.partnerId, partnerId),
        eq(evaluations.status, 'active')
      )
    )
    .limit(1);
  return row ?? null;
}

export async function createEvaluationWithTrader(data: {
  partnerId: number;
  name: string;
  email: string;
  evalType: 'SS' | 'SSL';
  amount: string | number;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
}) {
  return db.transaction(async (tx) => {
    let traderRow = await getTraderByEmail(data.partnerId, data.email, tx);

    if (!traderRow) {
      traderRow = await createTrader(
        { partnerId: data.partnerId, name: data.name, email: data.email },
        tx
      );
      await incrementPartnerTraders(data.partnerId, tx);
    }

    const profitTarget = String(TRADING_PROFIT_TARGET_PERCENT);
    const maxDrawdown = String(TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT);
    const requiredDays = TRADING_REQUIRED_DAYS;
    const amount = String(data.amount || 0);

    const [evaluation] = await tx
      .insert(evaluations)
      .values({
        traderId: traderRow.id,
        partnerId: data.partnerId,
        evalType: data.evalType,
        amount,
        paymentMethod: data.paymentMethod ?? null,
        paymentProofUrl: data.paymentProofUrl ?? null,
        status: 'pending_payment',
        profitTarget,
        currentProfit: '0',
        maxDrawdown,
        currentDrawdown: '0',
        tradingDays: 0,
        requiredDays,
      })
      .returning();

    await incrementPartnerRevenue(data.partnerId, amount, tx);

    return {
      trader: traderRow,
      evaluation: mapEvaluation(evaluation),
    };
  });
}

export async function createEvaluationForTrader(data: {
  partnerId: number;
  traderId: number;
  evalType: 'SS' | 'SSL';
  amount: string | number;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
}) {
  const profitTarget = String(TRADING_PROFIT_TARGET_PERCENT);
  const maxDrawdown = String(TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT);
  const requiredDays = TRADING_REQUIRED_DAYS;
  const amount = String(data.amount || 0);

  const [evaluation] = await db
    .insert(evaluations)
    .values({
      traderId: data.traderId,
      partnerId: data.partnerId,
      evalType: data.evalType,
      amount,
      paymentMethod: data.paymentMethod ?? null,
      paymentProofUrl: data.paymentProofUrl ?? null,
      status: 'pending_payment',
      profitTarget,
      currentProfit: '0',
      maxDrawdown,
      currentDrawdown: '0',
      tradingDays: 0,
      requiredDays,
    })
    .returning();

  await incrementPartnerRevenue(data.partnerId, amount);

  return mapEvaluation(evaluation);
}

type EvalUpdateFields = Partial<{
  status: 'pending_payment' | 'active' | 'passed' | 'failed' | 'suspended';
  currentProfit: string;
  currentDrawdown: string;
  tradingDays: number;
}>;

const evalBodyKeyToColumn: Record<string, keyof EvalUpdateFields> = {
  status: 'status',
  current_profit: 'currentProfit',
  current_drawdown: 'currentDrawdown',
  trading_days: 'tradingDays',
};

export async function updateEvaluation(
  evalId: number,
  partnerId: number,
  body: Record<string, unknown>
) {
  const updates: EvalUpdateFields = {};
  for (const [key, column] of Object.entries(evalBodyKeyToColumn)) {
    if (key in body) {
      (updates as Record<string, unknown>)[column] = body[key];
    }
  }
  if (Object.keys(updates).length === 0) return null;

  const [row] = await db
    .update(evaluations)
    .set({ ...updates, updatedAt: sql`NOW()` })
    .where(and(eq(evaluations.id, evalId), eq(evaluations.partnerId, partnerId)))
    .returning();
  return row ? mapEvaluation(row) : null;
}

export async function activateEvaluation(evalId: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(evaluations)
      .set({ status: 'active', updatedAt: sql`NOW()` })
      .where(and(eq(evaluations.id, evalId), eq(evaluations.status, 'pending_payment')))
      .returning({
        id: evaluations.id,
        trader_id: evaluations.traderId,
        partner_id: evaluations.partnerId,
        eval_type: evaluations.evalType,
        profit_target: evaluations.profitTarget,
      });
    if (!row) return null;

    const tradeAccount = await createTradeAccountActivation(
      {
        traderId: row.trader_id,
        partnerId: row.partner_id,
        evaluationId: row.id,
        evalType: row.eval_type,
        profitTarget: row.profit_target,
      },
      tx
    );

    return { ...row, account_creation_code: tradeAccount.creation_code };
  });
}

export async function updateEvaluationPayoutStatus(
  evalId: number,
  payoutStatus: 'processing' | 'paid'
) {
  const [row] = await db
    .update(evaluations)
    .set({ payoutStatus, updatedAt: sql`NOW()` })
    .where(and(eq(evaluations.id, evalId), eq(evaluations.status, 'passed')))
    .returning({ id: evaluations.id });
  return row ?? null;
}
