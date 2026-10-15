import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPartnerAdminViewRedirectUrl,
  getPartnerBaseUrl,
  getPartnerUrl,
  getTenantSlugFromHost,
  isReservedPartnerSlug,
  isValidPartnerSlug,
  resolvePartnerAdminViewBounceUrl,
} from '@/lib/tenant';

describe('reserved partner slugs', () => {
  it('rejects ft9ja, test, and prefix variations', () => {
    for (const slug of ['ft9ja', 'ft9ja-pro', 'ft9jatrading', 'test', 'test1', 'testing', 'test-firm']) {
      expect(isReservedPartnerSlug(slug)).toBe(true);
      expect(isValidPartnerSlug(slug)).toBe(false);
    }
  });

  it('blocks pre/post wildcards for high-risk names', () => {
    for (const slug of [
      'my-ft9ja',
      'www-ft9ja',
      'mytest',
      'contest',
      'latest',
      'my-admin',
      'admin-panel',
      'superadmin',
      'my-local',
      'localhosting',
      'my-partner',
      'partnersdesk',
      'my-support',
      'supportdesk',
      'my-www',
      'awwwards',
      'my-app',
      'app-panel',
    ]) {
      expect(isReservedPartnerSlug(slug)).toBe(true);
    }
  });

  it('blocks misspellings and one-typo variants', () => {
    for (const slug of ['ftnaja', 'ftnaija', 'admn', 'suport', 'patner', 'wwww', 'parnter', 'suport-desk']) {
      expect(isReservedPartnerSlug(slug)).toBe(true);
    }
  });

  it('blocks superadmin, customercare, promo, discount, and plurals', () => {
    for (const slug of [
      'superadmin',
      'super-admin',
      'superadmins',
      'super-admins',
      'customercare',
      'customer-care',
      'customercares',
      'promo',
      'promos',
      'my-promo',
      'discount',
      'discounts',
      'discount-desk',
      'accounts',
      'admins',
      'applies',
      'guides',
      'statuses',
      'ft9jas',
    ]) {
      expect(isReservedPartnerSlug(slug)).toBe(true);
    }
  });

  it('still accepts unrelated slugs', () => {
    for (const slug of ['powers', 'happy', 'harbor', 'traders-hub']) {
      expect(isReservedPartnerSlug(slug)).toBe(false);
      expect(isValidPartnerSlug(slug)).toBe(true);
    }
  });

  it('requires at least 4 characters and a leading letter', () => {
    for (const slug of ['abc', 'ab', 'a', '1abc', '9firm', '1234']) {
      expect(isValidPartnerSlug(slug)).toBe(false);
    }
    expect(isValidPartnerSlug('abcd')).toBe(true);
    expect(isValidPartnerSlug('a1bc')).toBe(true);
  });

  it('does not treat those hosts as partner storefronts', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'ft9ja.com');
    expect(getTenantSlugFromHost('ft9ja.ft9ja.com')).toBeNull();
    expect(getTenantSlugFromHost('test.ft9ja.com')).toBeNull();
    expect(getTenantSlugFromHost('ft9ja-pro.ft9ja.com')).toBeNull();
    expect(getTenantSlugFromHost('my-admin.ft9ja.com')).toBeNull();
    expect(getTenantSlugFromHost('powers.ft9ja.com')).toBe('powers');
    vi.unstubAllEnvs();
  });
});

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
      resolvePartnerAdminViewBounceUrl('powers', 'http://localhost:4000')
    ).toBe('http://localhost:4000/api/partners/powers/admin-view');
  });

  it('uses the partner subdomain from production Super Admin', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'ft9ja.com');
    expect(
      resolvePartnerAdminViewBounceUrl('powers', 'https://partners.ft9ja.com')
    ).toBe('https://powers.ft9ja.com/api/partners/powers/admin-view');
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
