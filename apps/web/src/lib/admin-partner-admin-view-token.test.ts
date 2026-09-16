import { describe, expect, it } from 'vitest';
import {
  createAdminPartnerAdminViewToken,
  verifyAdminPartnerAdminViewToken,
} from '@/lib/admin-partner-admin-view-token';

describe('admin partner-admin view token', () => {
  it('creates a token bound to slug', () => {
    const token = createAdminPartnerAdminViewToken({ slug: 'acme' });
    expect(verifyAdminPartnerAdminViewToken(token, 'acme')).toBe(true);
    expect(verifyAdminPartnerAdminViewToken(token, 'other')).toBe(false);
    expect(verifyAdminPartnerAdminViewToken('not-a-token', 'acme')).toBe(false);
  });
});
