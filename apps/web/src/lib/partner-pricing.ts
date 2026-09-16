import { normalizePartnerSlug } from './tenant';

export type EvalType = 'SS' | 'SSL';

export const FT9JA_BASE_PRICES: Record<EvalType, number> = {
  SS: 145_000,
  SSL: 49_000,
};

export const PARTNER_DISCOUNT_RATE = 0.25;

export const PARTNER_LICENSE_FEE = 95_000;
export const PARTNER_LICENSE_PERIOD_DAYS = 30;
export const PARTNER_MONTHLY_LICENSE_FEE = PARTNER_LICENSE_FEE;

/** Partners that never receive recurring ₦95,000 license invoices. */
export const LICENSE_RECURRING_EXEMPT_SLUGS = new Set(['apexfunds']);

export function isLicenseRecurringExempt(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return LICENSE_RECURRING_EXEMPT_SLUGS.has(normalizePartnerSlug(slug));
}

export function toMoneyNumber(value: number | string | null | undefined): number {
  return Number(value || 0);
}

export function getWholesalePrice(evalType: EvalType): number {
  return FT9JA_BASE_PRICES[evalType] * (1 - PARTNER_DISCOUNT_RATE);
}

export function getTraderPrice(evalType: EvalType, markup: number | string | null | undefined): number {
  return FT9JA_BASE_PRICES[evalType] + toMoneyNumber(markup);
}

export function getExpectedPrice(evalType: EvalType, markup: number | string | null | undefined): number {
  return getTraderPrice(evalType, markup);
}

export function getPartnerEarningsAtBaseMarkup(
  evalType: EvalType,
  markup: number | string | null | undefined
): number {
  return getTraderPrice(evalType, markup) - getWholesalePrice(evalType);
}

export function splitVerifiedAmount(
  evalType: EvalType,
  verifiedAmount: number | string,
  wholesaleAmount?: number | string | null
): { wholesale: number; partnerEarnings: number } {
  const wholesale = wholesaleAmount != null ? toMoneyNumber(wholesaleAmount) : getWholesalePrice(evalType);
  const verified = toMoneyNumber(verifiedAmount);
  return {
    wholesale,
    partnerEarnings: verified - wholesale,
  };
}

export function formatNaira(amount: number | string | null | undefined): string {
  return `₦${toMoneyNumber(amount).toLocaleString()}`;
}

export function amountsMatch(
  actual: number | string | null | undefined,
  expected: number | string | null | undefined,
  tolerance = 0
): boolean {
  return Math.abs(toMoneyNumber(actual) - toMoneyNumber(expected)) <= tolerance;
}
