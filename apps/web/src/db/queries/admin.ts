import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { evaluations } from '../schema/evaluations';
import { partners } from '../schema/partners';
import { traderRequests } from '../schema/trader-requests';
import { traders } from '../schema/traders';
import { tradeAccounts } from '../schema/trade-accounts';

export async function listKycSubmissions() {
  return db
    .select({
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      kyc_status: traders.kycStatus,
      kyc_full_name: traders.kycFullName,
      kyc_id_type: traders.kycIdType,
      kyc_id_number: traders.kycIdNumber,
      kyc_id_url: traders.kycIdUrl,
      kyc_address: traders.kycAddress,
      kyc_selfie_url: traders.kycSelfieUrl,
      kyc_submitted_at: traders.kycSubmittedAt,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(traders)
    .innerJoin(partners, eq(partners.id, traders.partnerId))
    .where(inArray(traders.kycStatus, ['submitted', 'approved', 'rejected']))
    .orderBy(
      sql`CASE ${traders.kycStatus} WHEN 'submitted' THEN 0 ELSE 1 END`,
      desc(traders.kycSubmittedAt)
    );
}

export async function listAllTradersByPartner() {
  return db
    .select({
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      trader_status: traders.status,
      kyc_status: traders.kycStatus,
      trader_created_at: traders.createdAt,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
      partner_status: partners.status,
    })
    .from(traders)
    .innerJoin(partners, eq(partners.id, traders.partnerId))
    .orderBy(asc(partners.firmName), desc(traders.createdAt));
}

export async function listPendingPayments() {
  return db
    .select({
      eval_id: evaluations.id,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      payment_method: evaluations.paymentMethod,
      payment_proof_url: evaluations.paymentProofUrl,
      status: evaluations.status,
      purchase_date: evaluations.purchaseDate,
      profit_target: evaluations.profitTarget,
      max_drawdown: evaluations.maxDrawdown,
      required_days: evaluations.requiredDays,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(evaluations)
    .innerJoin(traders, eq(traders.id, evaluations.traderId))
    .innerJoin(partners, eq(partners.id, evaluations.partnerId))
    .where(eq(evaluations.status, 'pending_payment'))
    .orderBy(desc(evaluations.purchaseDate));
}

export async function listAllEvaluationPayments() {
  return db
    .select({
      eval_id: evaluations.id,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      payment_method: evaluations.paymentMethod,
      payment_proof_url: evaluations.paymentProofUrl,
      status: evaluations.status,
      purchase_date: evaluations.purchaseDate,
      profit_target: evaluations.profitTarget,
      max_drawdown: evaluations.maxDrawdown,
      required_days: evaluations.requiredDays,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
      partner_status: partners.status,
    })
    .from(evaluations)
    .innerJoin(traders, eq(traders.id, evaluations.traderId))
    .innerJoin(partners, eq(partners.id, evaluations.partnerId))
    .orderBy(asc(partners.firmName), desc(evaluations.purchaseDate));
}

export async function getPaymentActivationNotice(evalId: number) {
  const [row] = await db
    .select({
      eval_id: evaluations.id,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      account_creation_code: tradeAccounts.creationCode,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(evaluations)
    .innerJoin(traders, eq(traders.id, evaluations.traderId))
    .innerJoin(partners, eq(partners.id, evaluations.partnerId))
    .innerJoin(tradeAccounts, eq(tradeAccounts.evaluationId, evaluations.id))
    .where(eq(evaluations.id, evalId))
    .limit(1);
  return row ?? null;
}

export async function listPassedEvaluationsForPayouts() {
  return db
    .select({
      eval_id: evaluations.id,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      status: evaluations.status,
      payout_status: evaluations.payoutStatus,
      current_profit: evaluations.currentProfit,
      trading_days: evaluations.tradingDays,
      required_days: evaluations.requiredDays,
      passed_at: evaluations.updatedAt,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      kyc_status: traders.kycStatus,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(evaluations)
    .innerJoin(traders, eq(traders.id, evaluations.traderId))
    .innerJoin(partners, eq(partners.id, evaluations.partnerId))
    .where(eq(evaluations.status, 'passed'))
    .orderBy(
      sql`CASE ${evaluations.payoutStatus}
        WHEN NULL THEN 0
        WHEN 'processing' THEN 1
        WHEN 'paid' THEN 2
        ELSE 0
      END`,
      desc(evaluations.updatedAt)
    );
}

export async function listAllTradeAccounts() {
  return db
    .select({
      trade_account_id: tradeAccounts.id,
      number: tradeAccounts.number,
      platform: tradeAccounts.platform,
      broker: tradeAccounts.broker,
      type_of_account: tradeAccounts.typeOfAccount,
      acc_size: tradeAccounts.accSize,
      creation_code: tradeAccounts.creationCode,
      blown: tradeAccounts.blown,
      inactive: tradeAccounts.inactive,
      has_aso: tradeAccounts.hasAso,
      aso_account_number: tradeAccounts.asoAccountNumber,
      created_at: tradeAccounts.createdAt,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
      partner_status: partners.status,
      eval_id: evaluations.id,
      eval_type: evaluations.evalType,
      is_completed: sql<boolean>`${tradeAccounts.number} > 0 AND ${tradeAccounts.password} <> '' AND ${tradeAccounts.investorPassword} <> ''`,
    })
    .from(tradeAccounts)
    .innerJoin(traders, eq(traders.id, tradeAccounts.traderId))
    .innerJoin(partners, eq(partners.id, tradeAccounts.partnerId))
    .leftJoin(evaluations, eq(evaluations.id, tradeAccounts.evaluationId))
    .orderBy(asc(partners.firmName), desc(tradeAccounts.createdAt));
}

export async function listAllTraderRequests() {
  return db
    .select({
      id: traderRequests.id,
      request_type: traderRequests.requestType,
      status: traderRequests.status,
      notes: traderRequests.notes,
      admin_notes: traderRequests.adminNotes,
      created_at: traderRequests.createdAt,
      updated_at: traderRequests.updatedAt,
      eval_id: traderRequests.evalId,
      eval_type: evaluations.evalType,
      amount: evaluations.amount,
      eval_status: evaluations.status,
      payout_status: evaluations.payoutStatus,
      trader_id: traders.id,
      trader_name: traders.name,
      trader_email: traders.email,
      kyc_status: traders.kycStatus,
      partner_id: partners.id,
      partner_slug: partners.slug,
      partner_firm_name: partners.firmName,
      partner_brand_color: partners.brandColor,
    })
    .from(traderRequests)
    .innerJoin(evaluations, eq(evaluations.id, traderRequests.evalId))
    .innerJoin(traders, eq(traders.id, traderRequests.traderId))
    .innerJoin(partners, eq(partners.id, traderRequests.partnerId))
    .orderBy(
      sql`CASE ${traderRequests.status} WHEN 'pending' THEN 0 ELSE 1 END`,
      desc(traderRequests.createdAt)
    );
}
