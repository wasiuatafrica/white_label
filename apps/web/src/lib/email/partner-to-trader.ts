import { sendEmail } from '@/app/api/utils/send-email';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type PartnerToTraderTemplateVariables = {
  't-11-password-reset': {
    TRADER_NAME: string;
    FIRM_NAME: string;
    SLUG: string;
    BRAND_COLOR: string;
    URL: string;
  };
};

export type PartnerToTraderTemplate = keyof PartnerToTraderTemplateVariables;

const TEMPLATE_META: Record<PartnerToTraderTemplate, { filename: string; subject: string }> = {
  't-11-password-reset': {
    filename: 't-11-password-reset.html',
    subject: 'Reset your {{FIRM_NAME}} password',
  },
};

const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

function getTemplateDirectory() {
  const appRelativeDir = path.join(process.cwd(), 'email_templates', 'partner-to-trader');
  if (existsSync(appRelativeDir)) return appRelativeDir;

  return path.join(process.cwd(), 'apps/web/email_templates/partner-to-trader');
}

function readTemplate(template: PartnerToTraderTemplate) {
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

function assertAllTokensResolved(template: PartnerToTraderTemplate, content: string) {
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
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeVariables<T extends PartnerToTraderTemplate>(
  variables: PartnerToTraderTemplateVariables[T]
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

export function renderPartnerToTraderTemplate<T extends PartnerToTraderTemplate>(
  template: T,
  variables: PartnerToTraderTemplateVariables[T]
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

export async function sendPartnerToTraderEmail<T extends PartnerToTraderTemplate>({
  template,
  to,
  variables,
}: {
  template: T;
  to: string;
  variables: PartnerToTraderTemplateVariables[T];
}) {
  const rendered = renderPartnerToTraderTemplate(template, variables);
  return sendEmail({
    to,
    from:
      process.env.SENDGRID_PARTNER_TRADER_FROM_EMAIL ||
      process.env.SENDGRID_FROM_EMAIL ||
      'FT9ja <accounts@ft9ja.com>',
    ...rendered,
  });
}

export async function sendTraderPasswordResetEmail(options: {
  to: string;
  traderName: string;
  firmName: string;
  slug: string;
  brandColor?: string | null;
  resetUrl: string;
}) {
  return sendPartnerToTraderEmail({
    template: 't-11-password-reset',
    to: options.to,
    variables: {
      TRADER_NAME: options.traderName,
      FIRM_NAME: options.firmName,
      SLUG: options.slug,
      BRAND_COLOR: options.brandColor || '#16A34A',
      URL: options.resetUrl,
    },
  });
}
