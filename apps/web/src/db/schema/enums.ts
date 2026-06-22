import { pgEnum } from 'drizzle-orm/pg-core';

export const partnerStatusEnum = pgEnum('partner_status', ['pending', 'active', 'suspended']);
export const partnerTemplateEnum = pgEnum('partner_template', ['minimal', 'bold', 'dark']);
export const traderStatusEnum = pgEnum('trader_status', ['active', 'suspended']);
export const kycStatusEnum = pgEnum('kyc_status', [
  'not_started',
  'submitted',
  'approved',
  'rejected',
]);
export const evalTypeEnum = pgEnum('eval_type', ['SS', 'SSL']);
export const evalStatusEnum = pgEnum('eval_status', [
  'pending_payment',
  'active',
  'passed',
  'failed',
  'suspended',
  'payment_rejected',
]);
export const payoutStatusEnum = pgEnum('payout_status', ['processing', 'paid']);
export const traderRequestTypeEnum = pgEnum('trader_request_type', [
  'talent_bonus',
  'aso_payout_ssl',
  'aso_account',
]);
export const traderRequestStatusEnum = pgEnum('trader_request_status', [
  'pending',
  'approved',
  'rejected',
]);
export const partnerPayoutRequestStatusEnum = pgEnum('partner_payout_request_status', [
  'pending',
  'approved',
  'rejected',
  'paid',
]);
export const asoRequestStatusEnum = pgEnum('aso_request_status', [
  'pending',
  'approved',
  'rejected',
  'completed',
]);
