import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPartnerAdminViewRedirectUrl,
  getPartnerBaseUrl,
  getPartnerUrl,
  resolvePartnerAdminViewBounceUrl,
} from '@/lib/tenant';

describe('getPartnerBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses https on production domains', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'ft9ja.com');
    expect(getPartnerBaseUrl('powers')).toBe('https://powers.ft9ja.com');
  });

  it('uses http on localhost including port', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'localhost:4000');
    expect(getPartnerBaseUrl('powers')).toBe('http://powers.localhost:4000');
    expect(getPartnerUrl('powers', '/api/partners/powers/admin-view')).toBe(
      'http://powers.localhost:4000/api/partners/powers/admin-view'
    );
  });
});

describe('partner admin view URLs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps local Super Admin view on the same origin', () => {
    expect(
      resolvePartnerAdminViewBounceUrl('powers', 'token-1', 'http://localhost:4000')
    ).toBe('http://localhost:4000/api/partners/powers/admin-view?token=token-1');
  });

  it('uses the partner subdomain from production Super Admin', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'ft9ja.com');
    expect(
      resolvePartnerAdminViewBounceUrl('powers', 'token-1', 'https://partners.ft9ja.com')
    ).toBe('https://powers.ft9ja.com/api/partners/powers/admin-view?token=token-1');
  });

  it('redirects to /{slug}/admin on the request host, not /admin', () => {
    const request = new Request('http://localhost:4000/api/partners/powers/admin-view', {
      headers: { host: 'localhost:4000' },
    });
    expect(getPartnerAdminViewRedirectUrl(request, 'powers')).toBe(
      'http://localhost:4000/powers/admin'
    );
  });
});
