import { describe, expect, it } from 'vitest';
import {
  type Ft9jaPartnerTemplate,
  getPartnerLifecycleEmailPlan,
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
      LICENSE_TYPE: '₦5,000/month for 3 calendar months from activation, then ₦95,000',
    },
  },
  {
    template: 'p-02-firm-live',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-03-invoice',
    variables: {
      OWNER_NAME: 'Ada',
      INVOICE_ID: '202606-PRIME',
      FIRM_NAME: 'Prime Traders',
      PERIOD_RANGE: '16 Sep 2026 – 16 Oct 2026',
      DUE_DATE: '16 Sep 2026',
      AMOUNT: '5,000',
      URL: 'https://prime.ft9ja.com/admin?tab=license',
    },
  },
  {
    template: 'p-04-payment-confirmed',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      REF: 'LIC-PRIME-202606',
      PERIOD_RANGE: '16 Sep 2026 – 16 Oct 2026',
      NEXT_DUE_DATE: '16 Oct 2026',
      AMOUNT: '5,000',
      URL: 'https://prime.ft9ja.com/admin?tab=license',
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
      AMOUNT: '5,000',
      URL: 'https://prime.ft9ja.com/admin',
    },
  },
  {
    template: 'p-06-suspension',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SUSPEND_DATE: '11 June 2026',
      AMOUNT: '5,000',
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
      LICENSE_COST: '5,000',
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
  {
    template: 'p-11-pin-reset',
    variables: {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      OTP: '482913',
      URL: 'https://prime.ft9ja.com/admin',
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

  it('p-02-firm-live does not expose or include Admin PIN', () => {
    const rendered = renderFt9jaPartnerTemplate('p-02-firm-live', {
      OWNER_NAME: 'Ada',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      URL: 'https://prime.ft9ja.com/admin',
    });

    expect(rendered.html).not.toContain('Admin PIN');
    expect(rendered.text).not.toContain('Admin PIN');
  });

  it('plans lifecycle emails correctly on approval and transitions', () => {
    // 1. pending -> active (Approval): sends ONLY welcome (P-01), NOT firm-live (P-02)
    const onApproval = getPartnerLifecycleEmailPlan({
      previousStatus: 'pending',
      currentStatus: 'active',
      previousMonthlyFeePaid: false,
      currentMonthlyFeePaid: true,
      generatedAdminPinPlain: '123456',
    });
    expect(onApproval).toEqual([
      { type: 'welcome', adminPinPlain: '123456' },
    ]);

    // 2. suspended -> active (Reinstatement): sends firm-live (P-02)
    const onReinstatement = getPartnerLifecycleEmailPlan({
      previousStatus: 'suspended',
      currentStatus: 'active',
      previousMonthlyFeePaid: true,
      currentMonthlyFeePaid: true,
      generatedAdminPinPlain: null,
    });
    expect(onReinstatement).toEqual([
      { type: 'firm-live' },
    ]);

    // 3. active -> suspended: sends suspension (P-06)
    const onSuspension = getPartnerLifecycleEmailPlan({
      previousStatus: 'active',
      currentStatus: 'suspended',
      previousMonthlyFeePaid: true,
      currentMonthlyFeePaid: false,
      generatedAdminPinPlain: null,
    });
    expect(onSuspension).toEqual([
      { type: 'suspension' },
    ]);

    // 4. Renewal payment on active partner: sends payment-confirmed (P-04)
    const onRenewalPayment = getPartnerLifecycleEmailPlan({
      previousStatus: 'active',
      currentStatus: 'active',
      previousMonthlyFeePaid: false,
      currentMonthlyFeePaid: true,
      generatedAdminPinPlain: null,
    });
    expect(onRenewalPayment).toEqual([
      { type: 'payment-confirmed' },
    ]);
  });
});
