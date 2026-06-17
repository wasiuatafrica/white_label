import { sendEmail } from '@/app/api/utils/send-email';
import { getPartnerUrl } from '@/lib/tenant';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type PartnerRecipient = {
  slug: string;
  firm_name: string;
  owner_name?: string | null;
  owner_email: string;
  admin_pin?: string | null;
  total_traders?: number;
  total_revenue?: string | number;
};

type Ft9jaPartnerTemplateVariables = {
  'p-01-welcome': {
    OWNER_NAME: string;
    FIRM_NAME: string;
    SLUG: string;
    ADMIN_PIN: string;
  };
  'p-02-firm-live': {
    OWNER_NAME: string;
    FIRM_NAME: string;
    SLUG: string;
    ADMIN_PIN: string;
    URL: string;
  };
  'p-03-invoice': {
    OWNER_NAME: string;
    INVOICE_ID: string;
    FIRM_NAME: string;
    MONTH: string;
    YEAR: string;
    DUE_DATE: string;
    URL: string;
  };
  'p-04-payment-confirmed': {
    OWNER_NAME: string;
    FIRM_NAME: string;
    REF: string;
    MONTH: string;
    YEAR: string;
    NEXT_DUE_DATE: string;
    URL: string;
  };
  'p-05-payment-overdue': {
    OWNER_NAME: string;
    FIRM_NAME: string;
    DAYS_OVERDUE: string;
    DUE_DATE: string;
    SUSPEND_DATE: string;
    URL: string;
  };
  'p-06-suspension': {
    OWNER_NAME: string;
    FIRM_NAME: string;
    SUSPEND_DATE: string;
    URL: string;
  };
  'p-07-monthly-report': {
    MONTH: string;
    YEAR: string;
    OWNER_NAME: string;
    FIRM_NAME: string;
    NEW_TRADERS: string;
    TOTAL_TRADERS: string;
    EVALS_SOLD: string;
    GROSS_REVENUE: string;
    NET_EARNINGS: string;
    URL: string;
  };
  'p-08-trader-milestone': {
    MILESTONE: string;
    OWNER_NAME: string;
    FIRM_NAME: string;
    ESTIMATED_EARNINGS: string;
    TOTAL_TRADERS: string;
    ACTIVE_EVALS: string;
    REVENUE_RATE: string;
    URL: string;
  };
  'p-09-feature-update': {
    OWNER_NAME: string;
    URL: string;
  };
  'p-10-compliance': {
    OWNER_NAME: string;
    EFFECTIVE_DATE: string;
    URL: string;
  };
};

export type Ft9jaPartnerTemplate = keyof Ft9jaPartnerTemplateVariables;

const TEMPLATE_META: Record<Ft9jaPartnerTemplate, { filename: string; subject: string }> = {
  'p-01-welcome': {
    filename: 'p-01-welcome.html',
    subject: 'Welcome to the FT9ja Partners Program',
  },
  'p-02-firm-live': {
    filename: 'p-02-firm-live.html',
    subject: 'Your Firm is Now Live',
  },
  'p-03-invoice': {
    filename: 'p-03-invoice.html',
    subject: 'Monthly License Invoice - {{FIRM_NAME}}',
  },
  'p-04-payment-confirmed': {
    filename: 'p-04-payment-confirmed.html',
    subject: 'Payment Received - Thank You',
  },
  'p-05-payment-overdue': {
    filename: 'p-05-payment-overdue.html',
    subject: 'License Payment Overdue - Action Required',
  },
  'p-06-suspension': {
    filename: 'p-06-suspension.html',
    subject: 'Account Suspended - {{FIRM_NAME}}',
  },
  'p-07-monthly-report': {
    filename: 'p-07-monthly-report.html',
    subject: 'Monthly Performance Report - {{MONTH}} {{YEAR}}',
  },
  'p-08-trader-milestone': {
    filename: 'p-08-trader-milestone.html',
    subject: 'Milestone: {{MILESTONE}} Traders Reached',
  },
  'p-09-feature-update': {
    filename: 'p-09-feature-update.html',
    subject: 'New Features Now Live on FT9ja',
  },
  'p-10-compliance': {
    filename: 'p-10-compliance.html',
    subject: 'Important Compliance Notice - Action Required',
  },
};

const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;
const NAIRA_FORMATTER = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 0,
});
const DATE_FORMATTER = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-NG', {
  month: 'long',
});

function getTemplateDirectory() {
  const appRelativeDir = path.join(process.cwd(), 'email_templates', 'ft9ja-to-partner');
  if (existsSync(appRelativeDir)) return appRelativeDir;

  return path.join(process.cwd(), 'apps/web/email_templates/ft9ja-to-partner');
}

function readTemplate(template: Ft9jaPartnerTemplate) {
  const { filename } = TEMPLATE_META[template];
  return readFileSync(path.join(getTemplateDirectory(), filename), 'utf8');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTokens(
  input: string,
  variables: Record<string, string>,
  options: { escape: boolean }
) {
  return input.replace(TOKEN_PATTERN, (_match, token: string) => {
    const value = variables[token];
    if (value === undefined) return `{{${token}}}`;
    return options.escape ? escapeHtml(value) : value;
  });
}

function assertAllTokensResolved(
  template: Ft9jaPartnerTemplate,
  content: string
) {
  const unresolved = [...content.matchAll(TOKEN_PATTERN)].map((match) => match[1]);
  if (unresolved.length > 0) {
    throw new Error(
      `Missing variables for ${template}: ${[...new Set(unresolved)].sort().join(', ')}`
    );
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|h1|h2|h3|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '-')
    .replace(/&rarr;/g, '->')
    .replace(/&#8358;/g, 'NGN ')
    .replace(/&#9989;/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeVariables<T extends Ft9jaPartnerTemplate>(
  variables: Ft9jaPartnerTemplateVariables[T]
) {
  const normalized: Record<string, string> = {};
  const emptyVariables: string[] = [];

  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null || value === '') {
      emptyVariables.push(key);
    } else {
      normalized[key] = String(value);
    }
  }

  if (emptyVariables.length > 0) {
    throw new Error(`Empty variables: ${emptyVariables.sort().join(', ')}`);
  }

  return normalized;
}

export function renderFt9jaPartnerTemplate<T extends Ft9jaPartnerTemplate>(
  template: T,
  variables: Ft9jaPartnerTemplateVariables[T]
) {
  const normalized = normalizeVariables(variables);
  const html = renderTokens(readTemplate(template), normalized, { escape: true });
  const subject = renderTokens(TEMPLATE_META[template].subject, normalized, { escape: false });

  assertAllTokensResolved(template, `${subject}\n${html}`);

  return {
    subject,
    html,
    text: htmlToText(html),
  };
}

export async function sendFt9jaPartnerEmail<T extends Ft9jaPartnerTemplate>({
  template,
  to,
  variables,
}: {
  template: T;
  to: string;
  variables: Ft9jaPartnerTemplateVariables[T];
}) {
  const rendered = renderFt9jaPartnerTemplate(template, variables);
  return sendEmail({
    to,
    from:
      process.env.SENDGRID_FT9JA_PARTNER_FROM_EMAIL ||
      process.env.SENDGRID_FROM_EMAIL ||
      'FT9ja Partners <accounts@ft9ja.com>',
    ...rendered,
  });
}

function ownerName(partner: PartnerRecipient) {
  return partner.owner_name?.trim() || 'Partner';
}

function partnerVariables(partner: PartnerRecipient) {
  return {
    OWNER_NAME: ownerName(partner),
    FIRM_NAME: partner.firm_name,
    SLUG: partner.slug,
    ADMIN_PIN: partner.admin_pin || '',
    URL: getPartnerUrl(partner.slug, '/admin'),
  };
}

function formatDate(date: Date) {
  return DATE_FORMATTER.format(date);
}

function formatMonth(date: Date) {
  return MONTH_FORMATTER.format(date);
}

function formatYear(date: Date) {
  return String(date.getFullYear());
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function formatAmount(value: string | number | undefined) {
  const numeric = Number(String(value ?? 0).replace(/,/g, ''));
  return NAIRA_FORMATTER.format(Number.isFinite(numeric) ? numeric : 0);
}

function licenseReference(partner: PartnerRecipient, date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `LIC-${partner.slug.toUpperCase()}-${date.getFullYear()}${month}`;
}

export async function sendPartnerWelcomeEmail(partner: PartnerRecipient) {
  const { OWNER_NAME, FIRM_NAME, SLUG, ADMIN_PIN } = partnerVariables(partner);
  return sendFt9jaPartnerEmail({
    template: 'p-01-welcome',
    to: partner.owner_email,
    variables: { OWNER_NAME, FIRM_NAME, SLUG, ADMIN_PIN },
  });
}

export async function sendPartnerFirmLiveEmail(partner: PartnerRecipient) {
  return sendFt9jaPartnerEmail({
    template: 'p-02-firm-live',
    to: partner.owner_email,
    variables: partnerVariables(partner),
  });
}

export async function sendPartnerLicensePaymentConfirmedEmail(
  partner: PartnerRecipient,
  paidAt = new Date()
) {
  return sendFt9jaPartnerEmail({
    template: 'p-04-payment-confirmed',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      FIRM_NAME: partner.firm_name,
      REF: licenseReference(partner, paidAt),
      MONTH: formatMonth(paidAt),
      YEAR: formatYear(paidAt),
      NEXT_DUE_DATE: formatDate(addMonths(paidAt, 1)),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerSuspensionEmail(
  partner: PartnerRecipient,
  suspendedAt = new Date()
) {
  return sendFt9jaPartnerEmail({
    template: 'p-06-suspension',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      FIRM_NAME: partner.firm_name,
      SUSPEND_DATE: formatDate(suspendedAt),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerLicenseInvoiceEmail(
  partner: PartnerRecipient,
  { invoiceId, dueDate, period = new Date() }: { invoiceId: string; dueDate: Date; period?: Date }
) {
  return sendFt9jaPartnerEmail({
    template: 'p-03-invoice',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      INVOICE_ID: invoiceId,
      FIRM_NAME: partner.firm_name,
      MONTH: formatMonth(period),
      YEAR: formatYear(period),
      DUE_DATE: formatDate(dueDate),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerPaymentOverdueEmail(
  partner: PartnerRecipient,
  {
    daysOverdue,
    dueDate,
    suspendDate,
  }: { daysOverdue: number; dueDate: Date; suspendDate: Date }
) {
  return sendFt9jaPartnerEmail({
    template: 'p-05-payment-overdue',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      FIRM_NAME: partner.firm_name,
      DAYS_OVERDUE: String(daysOverdue),
      DUE_DATE: formatDate(dueDate),
      SUSPEND_DATE: formatDate(suspendDate),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerMonthlyReportEmail(
  partner: PartnerRecipient,
  {
    period,
    newTraders,
    totalTraders,
    evalsSold,
    grossRevenue,
    netEarnings,
  }: {
    period: Date;
    newTraders: number;
    totalTraders: number;
    evalsSold: number;
    grossRevenue: string | number;
    netEarnings: string | number;
  }
) {
  return sendFt9jaPartnerEmail({
    template: 'p-07-monthly-report',
    to: partner.owner_email,
    variables: {
      MONTH: formatMonth(period),
      YEAR: formatYear(period),
      OWNER_NAME: ownerName(partner),
      FIRM_NAME: partner.firm_name,
      NEW_TRADERS: String(newTraders),
      TOTAL_TRADERS: String(totalTraders),
      EVALS_SOLD: String(evalsSold),
      GROSS_REVENUE: formatAmount(grossRevenue),
      NET_EARNINGS: formatAmount(netEarnings),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerTraderMilestoneEmail(
  partner: PartnerRecipient,
  {
    milestone,
    activeEvaluations,
    estimatedEarnings,
    revenueRate,
  }: {
    milestone: number;
    activeEvaluations: number;
    estimatedEarnings: string | number;
    revenueRate: string | number;
  }
) {
  return sendFt9jaPartnerEmail({
    template: 'p-08-trader-milestone',
    to: partner.owner_email,
    variables: {
      MILESTONE: String(milestone),
      OWNER_NAME: ownerName(partner),
      FIRM_NAME: partner.firm_name,
      ESTIMATED_EARNINGS: formatAmount(estimatedEarnings),
      TOTAL_TRADERS: String(partner.total_traders ?? milestone),
      ACTIVE_EVALS: String(activeEvaluations),
      REVENUE_RATE: formatAmount(revenueRate),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerFeatureUpdateEmail(partner: PartnerRecipient) {
  return sendFt9jaPartnerEmail({
    template: 'p-09-feature-update',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      URL: getPartnerUrl(partner.slug, '/admin'),
    },
  });
}

export async function sendPartnerComplianceNoticeEmail(
  partner: PartnerRecipient,
  { effectiveDate }: { effectiveDate: Date }
) {
  return sendFt9jaPartnerEmail({
    template: 'p-10-compliance',
    to: partner.owner_email,
    variables: {
      OWNER_NAME: ownerName(partner),
      EFFECTIVE_DATE: formatDate(effectiveDate),
      URL: getPartnerUrl(partner.slug, '/legal'),
    },
  });
}
