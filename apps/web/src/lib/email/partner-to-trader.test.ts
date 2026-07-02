import { describe, expect, it } from 'vitest';
import { renderPartnerToTraderTemplate } from './partner-to-trader';

describe('partner-to-trader email templates', () => {
  it('renders all variables for t-11-password-reset', () => {
    const rendered = renderPartnerToTraderTemplate('t-11-password-reset', {
      TRADER_NAME: 'John',
      FIRM_NAME: 'Prime Traders',
      SLUG: 'prime',
      BRAND_COLOR: '#16A34A',
      URL: 'https://prime.ft9ja.com/reset-password?token=abc',
    });

    expect(rendered.subject).toBe('Reset your Prime Traders password');
    expect(rendered.html).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    expect(rendered.text).toContain('John');
    expect(rendered.text).toContain('https://prime.ft9ja.com/reset-password?token=abc');
  });
});
