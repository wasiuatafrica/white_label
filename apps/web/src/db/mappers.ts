import type { Evaluation } from './schema/evaluations';
import type { Partner } from './schema/partners';
import type { PartnerPayoutRequest } from './schema/partner-payout-requests';
import type { Trader } from './schema/traders';
import type { TraderRequest } from './schema/trader-requests';

export function mapPartner(row: Partner) {
  return {
    id: row.id,
    slug: row.slug,
    firm_name: row.firmName,
    owner_name: row.ownerName,
    owner_email: row.ownerEmail,
    logo_url: row.logoUrl,
    brand_color: row.brandColor,
    secondary_color: row.secondaryColor,
    tagline: row.tagline,
    description: row.description,
    template: row.template,
    status: row.status,
    admin_pin: row.adminPin,
    fee_markup: row.feeMarkup,
    monthly_fee_paid: row.monthlyFeePaid,
    setup_fee_waived: row.setupFeeWaived,
    total_traders: row.totalTraders,
    total_revenue: row.totalRevenue,
    payment_proof_url: row.paymentProofUrl,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapPartnerPublic(row: Partner) {
  const full = mapPartner(row);
  const { admin_pin: _adminPin, ...rest } = full;
  return rest;
}

export function mapTrader(row: Trader) {
  return {
    id: row.id,
    partner_id: row.partnerId,
    name: row.name,
    email: row.email,
    password_hash: row.passwordHash,
    status: row.status,
    reset_token: row.resetToken,
    reset_token_expires: row.resetTokenExpires,
    kyc_status: row.kycStatus,
    kyc_full_name: row.kycFullName,
    kyc_id_type: row.kycIdType,
    kyc_id_number: row.kycIdNumber,
    kyc_id_url: row.kycIdUrl,
    kyc_address: row.kycAddress,
    kyc_selfie_url: row.kycSelfieUrl,
    kyc_submitted_at: row.kycSubmittedAt,
    created_at: row.createdAt,
  };
}

export function mapEvaluation(row: Evaluation) {
  return {
    id: row.id,
    trader_id: row.traderId,
    partner_id: row.partnerId,
    eval_type: row.evalType,
    amount: row.amount,
    status: row.status,
    profit_target: row.profitTarget,
    current_profit: row.currentProfit,
    max_drawdown: row.maxDrawdown,
    current_drawdown: row.currentDrawdown,
    trading_days: row.tradingDays,
    required_days: row.requiredDays,
    payout_status: row.payoutStatus,
    purchase_date: row.purchaseDate,
    updated_at: row.updatedAt,
  };
}

export function mapTraderRequest(row: TraderRequest) {
  return {
    id: row.id,
    trader_id: row.traderId,
    partner_id: row.partnerId,
    eval_id: row.evalId,
    request_type: row.requestType,
    notes: row.notes,
    admin_notes: row.adminNotes,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapPartnerPayoutRequest(row: PartnerPayoutRequest) {
  return {
    id: row.id,
    partner_id: row.partnerId,
    amount_requested: row.amountRequested,
    bank_name: row.bankName,
    account_number: row.accountNumber,
    account_name: row.accountName,
    notes: row.notes,
    status: row.status,
    created_at: row.createdAt,
  };
}
