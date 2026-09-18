import { normalizePartnerSlug } from './tenant';

export type EvalType = 'SS' | 'SSL';

export const FT9JA_BASE_PRICES: Record<EvalType, number> = {
  SS: 145_000,
  SSL: 49_000,
};

export const PARTNER_DISCOUNT_RATE = 0.25;

export const PARTNER_LICENSE_FEE = 95_000;
export const PARTNER_LICENSE_INTRO_FEE = 5_000;
export const PARTNER_LICENSE_INTRO_CALENDAR_MONTHS = 3;
export const PARTNER_LICENSE_PERIOD_DAYS = 30;
export const PARTNER_MONTHLY_LICENSE_FEE = PARTNER_LICENSE_FEE;

const LAGOS_TIME_ZONE = 'Africa/Lagos';
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

function lagosDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LAGOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function fromLagosParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - LAGOS_OFFSET_MS);
}

/**
 * Adds calendar months in Africa/Lagos, keeping the local clock time.
 * Day is clamped when the target month is shorter (e.g. 31 Jan → 28/29 Feb).
 */
export function addCalendarMonthsLagos(date: Date, months: number): Date {
  const parts = lagosDateParts(date);
  const monthIndex = parts.month - 1 + months;
  const year = parts.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(parts.day, lastDay);
  return fromLagosParts(year, month + 1, day, parts.hour, parts.minute, parts.second);
}

export function getPartnerLicenseFee(
  introEndsAt: Date | null | undefined,
  periodStart: Date
): number {
  if (introEndsAt && periodStart.getTime() < introEndsAt.getTime()) {
    return PARTNER_LICENSE_INTRO_FEE;
  }
  return PARTNER_LICENSE_FEE;
}

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
