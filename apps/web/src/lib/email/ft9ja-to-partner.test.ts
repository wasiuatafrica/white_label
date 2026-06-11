import { describe, expect, it } from 'vitest';
import {
  type Ft9jaPartnerTemplate,
  renderFt9jaPartnerTemplate,
} from './ft9ja-to-partner';

const TEMPLATE_CASES: Array<{
  template: Ft9jaPartnerTemplate;
  variables: Parameters<typeof renderFt9jaPartnerTemplate>[1];
}> = [
  {
    template: 'p-01-welcome',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      ADMIN_PIN: '482913',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-02-firm-live',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      ADMIN_PIN: '482913',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-03-invoice',
    variables: {
      OWNER_NAME: 'Ada',
      INVOICE_ID: '202606-PRIME',
      FIRM_NAME: 'Prime Traders',
      MONTH: 'June',
      YEAR: '2026',
      DUE_DATE: '15 June 2026',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-04-payment-confirmed',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      REF: 'LIC-PRIME-202606',
      MONTH: 'June',
      YEAR: '2026',
      NEXT_DUE_DATE: '11 July 2026',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-05-payment-overdue',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      DAYS_OVERDUE: '7',
      DUE_DATE: '1 June 2026',
      SUSPEND_DATE: '13 June 2026',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-06-suspension',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SUSPEND_DATE: '11 June 2026',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-07-monthly-report',
    variables: {
      MONTH: 'June',
      YEAR: '2026',
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      NEW_TRADERS: '12',
      TOTAL_TRADERS: '42',
      EVALS_SOLD: '20',
      GROSS_REVENUE: '950,000',
      NET_EARNINGS: '855,000',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-08-trader-milestone',
    variables: {
      MILESTONE: '50',
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      ESTIMATED_EARNINGS: '1,000,000',
      TOTAL_TRADERS: '50',
      ACTIVE_EVALS: '18',
      REVENUE_RATE: '2,500,000',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-09-feature-update',
    variables: {
      OWNER_NAME: 'Ada',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-10-compliance',
    variables: {
      OWNER_NAME: 'Ada',
      EFFECTIVE_DATE: '15 June 2026',
      URL: 'https://prime.ft9ja.com/legal',
    },
  },
];

describe('FT9ja partner email templates', () => {
  it.each(TEMPLATE_CASES)('renders all variables for $template', ({ template, variables }) => {
    const rendered = renderFt9jaPartnerTemplate(template, variables);

    expect(rendered.subject).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    expect(rendered.html).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    expect(rendered.text).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });
});
