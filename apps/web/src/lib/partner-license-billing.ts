import { isLicenseRecurringExempt, PARTNER_LICENSE_PERIOD_DAYS } from './partner-pricing';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const OVERDUE_GRACE_PERIOD_DAYS = 7;
export const OVERDUE_GRACE_PERIOD_MS = OVERDUE_GRACE_PERIOD_DAYS * DAY_IN_MS;
const CALENDAR_YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Adds an exact number of 24h days to a date.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

/**
 * YYYY-MM-DD from the timestamp's UTC calendar date (matches Super Admin period display).
 */
export function formatCalendarYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isCalendarYmd(value: string): boolean {
  const match = CALENDAR_YMD_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  return new Date(utc).toISOString().slice(0, 10) === value;
}

/**
 * Moves `original` by whole UTC calendar days so its YYYY-MM-DD matches `ymd`,
 * keeping the original clock time. End dates should then be addDays(result, 30).
 */
export function shiftToCalendarDate(original: Date, ymd: string): Date {
  if (!isCalendarYmd(ymd)) {
    throw new RangeError(`Invalid calendar date: ${ymd}`);
  }
  const current = formatCalendarYmd(original);
  if (current === ymd) return new Date(original.getTime());
  const deltaDays =
    (Date.parse(`${ymd}T00:00:00.000Z`) - Date.parse(`${current}T00:00:00.000Z`)) / DAY_IN_MS;
  return addDays(original, deltaDays);
}

/**
 * Formats a Date as YYYYMMDD in UTC.
 */
export function formatUtcDateCompact(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generates an invoice number: INV-{SLUG}-{YYYYMMDD}
 */
export function generateInvoiceNumber(slug: string, periodStart: Date): string {
  const cleanSlug = slug.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return `INV-${cleanSlug}-${formatUtcDateCompact(periodStart)}`;
}

/**
 * Formats a date range into English, e.g. "16 Sep 2026 – 16 Oct 2026"
 */
export function formatPeriodRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatDateLagos(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  return formatter.format(date);
}

/**
 * Determines whether a given invoice covers the current timestamp.
 * Covered if status is 'paid' or 'waived' and periodStart <= now < periodEnd.
 */
export function isInvoiceCovered(
  invoice: {
    status: string;
    periodStart: Date;
    periodEnd: Date;
  },
  now: Date = new Date()
): boolean {
  if (invoice.status !== 'paid' && invoice.status !== 'waived') {
    return false;
  }
  const nowTime = now.getTime();
  return nowTime >= invoice.periodStart.getTime() && nowTime < invoice.periodEnd.getTime();
}

/**
 * Calculates the next 30-day period given the previous periodEnd.
 */
export function computeNextPeriod(previousPeriodEnd: Date): {
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
} {
  const periodStart = new Date(previousPeriodEnd.getTime());
  const periodEnd = addDays(periodStart, PARTNER_LICENSE_PERIOD_DAYS);
  const dueAt = new Date(periodStart.getTime());
  return { periodStart, periodEnd, dueAt };
}

/**
 * Checks if a pending invoice is overdue (now >= dueAt + 7 days) and has no receipt uploaded.
 */
export function isInvoiceEligibleForOverdue(
  invoice: {
    status: string;
    dueAt: Date;
    paymentProofUrl?: string | null;
    receiptUploadedAt?: Date | null;
  },
  now: Date = new Date()
): boolean {
  if (invoice.status !== 'pending' && invoice.status !== 'overdue') {
    return false;
  }
  // If partner uploaded receipt, it's awaiting Super Admin review, not overdue.
  if (invoice.paymentProofUrl || invoice.receiptUploadedAt) {
    return false;
  }
  return now.getTime() >= invoice.dueAt.getTime() + OVERDUE_GRACE_PERIOD_MS;
}

export type LicenseInvoiceRecordStatus =
  | 'pending'
  | 'receipt_uploaded'
  | 'overdue'
  | 'paid'
  | 'waived';

export type LicenseCoverageStatus = LicenseInvoiceRecordStatus | 'expired' | 'none' | 'exempt';

export type LicenseLifecycleStatus = LicenseInvoiceRecordStatus | 'expired';

export type LicenseCoverageSummary = {
  isCovered: boolean;
  status: LicenseCoverageStatus;
  periodStart: Date | null;
  periodEnd: Date | null;
  nextDueAt: Date | null;
};

type CoverageInvoiceInput = {
  status: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  dueAt: Date | string;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Paid/waived invoices are due again at period_end (next cycle start).
 * Open invoices are due at due_at (period_start of that unpaid window).
 */
export function nextDueAtForInvoice(invoice: CoverageInvoiceInput): Date {
  const status = invoice.status;
  if (status === 'paid' || status === 'waived') {
    return asDate(invoice.periodEnd);
  }
  return asDate(invoice.dueAt);
}

/**
 * Historical payment status plus whether the 30-day window has already ended.
 * A paid invoice whose period ended is Expired, not currently Paid.
 */
export function getInvoiceLifecycleStatus(
  invoice: { status: string; periodEnd: Date | string },
  now: Date = new Date()
): LicenseLifecycleStatus {
  const periodEnd = asDate(invoice.periodEnd);
  if (
    (invoice.status === 'paid' || invoice.status === 'waived') &&
    now.getTime() >= periodEnd.getTime()
  ) {
    return 'expired';
  }

  if (
    invoice.status === 'pending' ||
    invoice.status === 'receipt_uploaded' ||
    invoice.status === 'overdue' ||
    invoice.status === 'paid' ||
    invoice.status === 'waived'
  ) {
    return invoice.status;
  }

  return 'pending';
}

export function licenseLifecycleLabel(status: LicenseLifecycleStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'waived':
      return 'Complimentary';
    case 'receipt_uploaded':
      return 'In Review';
    case 'overdue':
      return 'Overdue';
    case 'pending':
      return 'Pending';
    case 'expired':
      return 'Expired';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function licenseLifecycleBadgeClass(status: LicenseLifecycleStatus): string {
  switch (status) {
    case 'paid':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'waived':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'receipt_uploaded':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'overdue':
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'pending':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function exemptLicenseCoverage(): LicenseCoverageSummary {
  return {
    isCovered: true,
    status: 'exempt',
    periodStart: null,
    periodEnd: null,
    nextDueAt: null,
  };
}

export function applyRecurringLicenseExemption(
  slug: string | null | undefined,
  coverage: LicenseCoverageSummary
): LicenseCoverageSummary {
  return isLicenseRecurringExempt(slug) ? exemptLicenseCoverage() : coverage;
}

/**
 * Current coverage for a partner based on their latest invoice.
 * nextDueAt is when the next ₦95,000 is owed — period_end for a covered
 * (or expired) paid/waived window, due_at for an open unpaid invoice.
 */
export function summarizeLicenseCoverage(
  invoice: CoverageInvoiceInput | null,
  now: Date = new Date()
): LicenseCoverageSummary {
  if (!invoice) {
    return {
      isCovered: false,
      status: 'none',
      periodStart: null,
      periodEnd: null,
      nextDueAt: null,
    };
  }

  const periodStart = asDate(invoice.periodStart);
  const periodEnd = asDate(invoice.periodEnd);
  const isCovered = isInvoiceCovered(
    { status: invoice.status, periodStart, periodEnd },
    now
  );

  return {
    isCovered,
    status: getInvoiceLifecycleStatus({ status: invoice.status, periodEnd }, now),
    periodStart,
    periodEnd,
    nextDueAt: nextDueAtForInvoice(invoice),
  };
}
