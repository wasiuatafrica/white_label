import { describe, expect, it } from 'vitest';
import {
  createAdminPartnerAdminViewToken,
  verifyAdminPartnerAdminViewToken,
} from '@/lib/admin-partner-admin-view-token';

describe('admin partner-admin view token', () => {
  it('creates a one-time token bound to slug and admin', async () => {
    const token = await createAdminPartnerAdminViewToken({ slug: 'acme', adminUserId: 7 });
    expect(token).toBeTruthy();
    const parsed = verifyAdminPartnerAdminViewToken(token!, 'acme');
    expect(parsed?.adminUserId).toBe(7);
    expect(parsed?.jti).toBeTruthy();
    expect(verifyAdminPartnerAdminViewToken(token!, 'other')).toBeNull();
    expect(verifyAdminPartnerAdminViewToken('not-a-token', 'acme')).toBeNull();
  });
});
