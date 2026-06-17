import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../index';
import type { DbOrTx } from '../types';
import { asoRequests } from '../schema/aso-requests';
import { evaluations } from '../schema/evaluations';
import { partners } from '../schema/partners';
import { traders } from '../schema/traders';
import { tradeAccounts } from '../schema/trade-accounts';
import { createAsoTradeAccount } from './trade-accounts';
import {
  getTradingTelemetryMetrics,
  TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT,
  TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT,
  TRADING_PROFIT_TARGET_PERCENT,
} from '@/lib/trading-telemetry';

const ASO_APPROVAL_TOKEN_DAYS = 14;
const OPEN_ASO_STATUSES = ['pending', 'approved', 'completed'] as const;

function hashAsoToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateAsoToken() {
  return randomBytes(32).toString('hex');
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function mapAsoRequest(row: typeof asoRequests.$inferSelect) {
  return {
    id: row.id,
    trader_id: row.traderId,
    partner_id: row.partnerId,
    ss_account_id: row.ssAccountId,
    ss_account_number: row.ssAccountNumber,
    status: row.status,
    requested_at: row.requestedAt,
    reviewed_at: row.reviewedAt,
    reviewed_by: row.reviewedBy,
    rejection_reason: row.rejectionReason,
    eligibility_profit: row.eligibilityProfit,
    eligibility_profit_target: row.eligibilityProfitTarget,
    eligibility_checked_at: row.eligibilityCheckedAt,
    approval_token_expires_at: row.approvalTokenExpiresAt,
    approval_token_used_at: row.approvalTokenUsedAt,
    aso_account_id: row.asoAccountId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export type AsoEligibility = {
  eligible: boolean;
  reason: string | null;
  account: {
    id: number;
    trader_id: number;
    partner_id: number;
    evaluation_id: number | null;
    number: number;
    type_of_account: string;
    has_aso: number | null;
    aso_account_id: number | null;
    profit_target: number;
    current_profit: number;
    daily_drawdown: number;
    max_daily_drawdown: number;
    account_drawdown: number;
    max_account_drawdown: number;
    blown: boolean;
    inactive: boolean;
  } | null;
};

export async function getAsoEligibilityForAccount(
  ssAccountId: number,
  traderId: number,
  partnerId: number,
  tx: DbOrTx = db,
  ignoreRequestId?: number
): Promise<AsoEligibility> {
  const [row] = await tx
    .select({
      accountId: tradeAccounts.id,
      traderId: tradeAccounts.traderId,
      partnerId: tradeAccounts.partnerId,
      evaluationId: tradeAccounts.evaluationId,
      number: tradeAccounts.number,
      typeOfAccount: tradeAccounts.typeOfAccount,
      hasAso: tradeAccounts.hasAso,
      asoAccountId: tradeAccounts.asoAccountId,
      profitTarget: tradeAccounts.profitTarget,
      blown: tradeAccounts.blown,
      inactive: tradeAccounts.inactive,
      evalStatus: evaluations.status,
      evalCurrentProfit: evaluations.currentProfit,
      evalCurrentDrawdown: evaluations.currentDrawdown,
      evalMaxDrawdown: evaluations.maxDrawdown,
    })
    .from(tradeAccounts)
    .leftJoin(evaluations, eq(evaluations.id, tradeAccounts.evaluationId))
    .where(
      and(
        eq(tradeAccounts.id, ssAccountId),
        eq(tradeAccounts.traderId, traderId),
        eq(tradeAccounts.partnerId, partnerId)
      )
    )
    .limit(1);

  if (!row) return { eligible: false, reason: 'Synthetic Signals account not found', account: null };
  if (row.typeOfAccount !== 'Synthetic-Signals') {
    return { eligible: false, reason: 'Only Synthetic Signals accounts qualify for ASO', account: null };
  }
  if (!row.number || row.number <= 0) {
    return { eligible: false, reason: 'Add the Synthetic Signals account number first', account: null };
  }
  if (row.inactive) return { eligible: false, reason: 'Account is inactive', account: null };
  if (row.hasAso || row.asoAccountId) {
    return { eligible: false, reason: 'ASO account already attached', account: null };
  }

  const [existingRequest] = await tx
    .select({ id: asoRequests.id, status: asoRequests.status })
    .from(asoRequests)
    .where(
      and(
        eq(asoRequests.ssAccountId, ssAccountId),
        inArray(asoRequests.status, [...OPEN_ASO_STATUSES]),
        ignoreRequestId ? ne(asoRequests.id, ignoreRequestId) : undefined
      )
    )
    .limit(1);
  if (existingRequest) {
    return {
      eligible: false,
      reason: `ASO request already ${existingRequest.status}`,
      account: null,
    };
  }

  let telemetry: Awaited<ReturnType<typeof getTradingTelemetryMetrics>> = null;
  try {
    telemetry = await getTradingTelemetryMetrics(row.number);
  } catch (error) {
    console.error('Failed to load ASO eligibility telemetry', {
      accountNumber: row.number,
      error,
    });
  }

  const profitTarget = telemetry?.profit_target ?? Number(row.profitTarget ?? TRADING_PROFIT_TARGET_PERCENT);
  const currentProfit = telemetry?.current_profit ?? Number(row.evalCurrentProfit ?? 0);
  const dailyDrawdown = telemetry?.daily_drawdown ?? 0;
  const maxDailyDrawdown = telemetry?.max_daily_drawdown ?? TRADING_DAILY_DRAWDOWN_LIMIT_PERCENT;
  const accountDrawdown = telemetry?.account_drawdown ?? Number(row.evalCurrentDrawdown ?? 0);
  const maxAccountDrawdown =
    telemetry?.max_account_drawdown ?? Number(row.evalMaxDrawdown ?? TRADING_ACCOUNT_DRAWDOWN_LIMIT_PERCENT);
  const blown =
    row.blown ||
    row.evalStatus === 'failed' ||
    dailyDrawdown >= maxDailyDrawdown ||
    accountDrawdown >= maxAccountDrawdown;

  const account = {
    id: row.accountId,
    trader_id: row.traderId,
    partner_id: row.partnerId,
    evaluation_id: row.evaluationId,
    number: row.number,
    type_of_account: row.typeOfAccount,
    has_aso: row.hasAso,
    aso_account_id: row.asoAccountId,
    profit_target: profitTarget,
    current_profit: currentProfit,
    daily_drawdown: dailyDrawdown,
    max_daily_drawdown: maxDailyDrawdown,
    account_drawdown: accountDrawdown,
    max_account_drawdown: maxAccountDrawdown,
    blown,
    inactive: row.inactive,
  };

  if (blown) return { eligible: false, reason: 'Account drawdown limit has been breached', account };
  if (currentProfit < profitTarget) {
    return { eligible: false, reason: 'Profit target has not been met', account };
  }

  return { eligible: true, reason: null, account };
}

export async function listAsoRequestsByTrader(traderId: number, partnerId: number) {
  const rows = await db
    .select()
    .from(asoRequests)
    .where(and(eq(asoRequests.traderId, traderId), eq(asoRequests.partnerId, partnerId)))
    .orderBy(desc(asoRequests.requestedAt));
  return rows.map(mapAsoRequest);
}

export async function createAsoRequest(data: {
  traderId: number;
  partnerId: number;
  ssAccountId: number;
}) {
  return db.transaction(async (tx) => {
    const eligibility = await getAsoEligibilityForAccount(
      data.ssAccountId,
      data.traderId,
      data.partnerId,
      tx
    );
    if (!eligibility.eligible || !eligibility.account) {
      return { request: null, eligibility };
    }

    const [row] = await tx
      .insert(asoRequests)
      .values({
        traderId: data.traderId,
        partnerId: data.partnerId,
        ssAccountId: data.ssAccountId,
        ssAccountNumber: eligibility.account.number,
        status: 'pending',
        eligibilityProfit: String(eligibility.account.current_profit),
        eligibilityProfitTarget: String(eligibility.account.profit_target),
        eligibilityCheckedAt: sql`NOW()`,
      })
      .returning();

    return { request: mapAsoRequest(row), eligibility };
  });
}

export async function listAllAsoRequests() {
  return db
    .select({
      id: asoRequests.id,
      status: asoRequests.status,
      ss_account_id: asoRequests.ssAccountId,
      ss_account_number: asoRequests.ssAccountNumber,
      requested_at: asoRequests.requestedAt,
      reviewed_at: asoRequests.reviewedAt,
      reviewed_by: asoRequests.reviewedBy,
      rejection_reason: asoRequests.rejectionReason,
      eligibility_profit: asoRequests.eligibilityProfit,
      eligibility_profit_target: asoRequests.eligibilityProfitTarget,
      eligibility_checked_at: asoRequests.eligibilityCheckedAt,
      approval_token_expires_at: asoRequests.approvalTokenExpiresAt,
      approval_token_used_at: asoRequests.approvalTokenUsedAt,
      aso_account_id: asoRequests.asoAccountId,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      kyc_status: traders.kycStatus,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(asoRequests)
    .innerJoin(traders, eq(traders.id, asoRequests.traderId))
    .innerJoin(partners, eq(partners.id, asoRequests.partnerId))
    .orderBy(
      sql`CASE ${asoRequests.status}
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        WHEN 'completed' THEN 2
        ELSE 3
      END`,
      desc(asoRequests.requestedAt)
    );
}

export async function getAsoApprovalNotice(requestId: number) {
  const [row] = await db
    .select({
      id: asoRequests.id,
      status: asoRequests.status,
      ss_account_id: asoRequests.ssAccountId,
      ss_account_number: asoRequests.ssAccountNumber,
      approval_token_hash: asoRequests.approvalTokenHash,
      approval_token_expires_at: asoRequests.approvalTokenExpiresAt,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(asoRequests)
    .innerJoin(traders, eq(traders.id, asoRequests.traderId))
    .innerJoin(partners, eq(partners.id, asoRequests.partnerId))
    .where(eq(asoRequests.id, requestId))
    .limit(1);
  return row ?? null;
}

export async function reviewAsoRequest(data: {
  requestId: number;
  status: 'approved' | 'rejected';
  reviewedBy?: string | null;
  adminNotes?: string | null;
}) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(asoRequests)
      .where(and(eq(asoRequests.id, data.requestId), eq(asoRequests.status, 'pending')))
      .limit(1);
    if (!request) return { request: null, token: null, eligibility: null };

    if (data.status === 'rejected') {
      const [row] = await tx
        .update(asoRequests)
        .set({
          status: 'rejected',
          rejectionReason: data.adminNotes ?? null,
          reviewedBy: data.reviewedBy ?? null,
          reviewedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(asoRequests.id, data.requestId))
        .returning();
      return { request: mapAsoRequest(row), token: null, eligibility: null };
    }

    const eligibility = await getAsoEligibilityForAccount(
      request.ssAccountId,
      request.traderId,
      request.partnerId,
      tx,
      request.id
    );
    if (!eligibility.eligible || !eligibility.account) {
      const [row] = await tx
        .update(asoRequests)
        .set({
          status: 'rejected',
          rejectionReason: eligibility.reason ?? 'Account is no longer eligible for ASO',
          reviewedBy: data.reviewedBy ?? null,
          reviewedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(asoRequests.id, data.requestId))
        .returning();
      return { request: mapAsoRequest(row), token: null, eligibility };
    }

    const token = generateAsoToken();
    const [row] = await tx
      .update(asoRequests)
      .set({
        status: 'approved',
        reviewedBy: data.reviewedBy ?? null,
        reviewedAt: sql`NOW()`,
        rejectionReason: data.adminNotes ?? null,
        eligibilityProfit: String(eligibility.account.current_profit),
        eligibilityProfitTarget: String(eligibility.account.profit_target),
        eligibilityCheckedAt: sql`NOW()`,
        approvalTokenHash: hashAsoToken(token),
        approvalTokenExpiresAt: addDays(new Date(), ASO_APPROVAL_TOKEN_DAYS),
        approvalTokenUsedAt: null,
        updatedAt: sql`NOW()`,
      })
      .where(eq(asoRequests.id, data.requestId))
      .returning();

    return { request: mapAsoRequest(row), token, eligibility };
  });
}

export async function createAsoAccountFromApproval(data: {
  traderId: number;
  partnerId: number;
  ssAccountId: number;
  token: string;
  number: number;
  password: string;
  investorPassword: string;
}) {
  return db.transaction(async (tx) => {
    const tokenHash = hashAsoToken(data.token);
    const [request] = await tx
      .select()
      .from(asoRequests)
      .where(
        and(
          eq(asoRequests.ssAccountId, data.ssAccountId),
          eq(asoRequests.traderId, data.traderId),
          eq(asoRequests.partnerId, data.partnerId),
          eq(asoRequests.status, 'approved'),
          eq(asoRequests.approvalTokenHash, tokenHash),
          sql`${asoRequests.approvalTokenUsedAt} IS NULL`,
          sql`${asoRequests.approvalTokenExpiresAt} > NOW()`
        )
      )
      .limit(1);

    if (!request) return { account: null, reason: 'Invalid or expired ASO approval token' };

    const eligibility = await getAsoEligibilityForAccount(
      data.ssAccountId,
      data.traderId,
      data.partnerId,
      tx,
      request.id
    );
    if (!eligibility.eligible) {
      return { account: null, reason: eligibility.reason ?? 'Account is no longer eligible for ASO' };
    }
    if (eligibility.account?.number === data.number) {
      return { account: null, reason: 'ASO account number must be different from the SS account number' };
    }

    const [numberInUse] = await tx
      .select({ id: tradeAccounts.id })
      .from(tradeAccounts)
      .where(and(eq(tradeAccounts.number, data.number), ne(tradeAccounts.id, data.ssAccountId)))
      .limit(1);
    if (numberInUse) return { account: null, reason: 'Account number is already in use' };

    const account = await createAsoTradeAccount(
      {
        traderId: data.traderId,
        partnerId: data.partnerId,
        ssAccountId: data.ssAccountId,
        number: data.number,
        password: data.password,
        investorPassword: data.investorPassword,
      },
      tx
    );
    if (!account) return { account: null, reason: 'ASO account already exists for this SS account' };

    await tx
      .update(asoRequests)
      .set({
        status: 'completed',
        approvalTokenUsedAt: sql`NOW()`,
        asoAccountId: account.id,
        updatedAt: sql`NOW()`,
      })
      .where(eq(asoRequests.id, request.id));

    return { account, reason: null };
  });
}
