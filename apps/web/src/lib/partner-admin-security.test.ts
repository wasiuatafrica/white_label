import { describe, expect, it } from 'vitest';
import { mapTrader, mapTraderForPartnerAdmin } from '@/db/mappers';
import type { Trader } from '@/db/schema/traders';
import {
  hashPartnerAdminPin,
  verifyPartnerAdminPin,
} from '@/lib/partner-pin-crypto';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';
import {
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
  verifyPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';
import { primeSessionsRevokedAtCache } from '@/lib/session-revocation';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import {
  createTraderSetupToken,
  verifyTraderSetupToken,
} from '@/lib/trader-setup-token';

const sampleTrader = {
  id: 1,
  partnerId: 2,
  name: 'Trader',
  email: 'trader@example.com',
  passwordHash: 'hash',
  status: 'active',
  resetToken: 'reset',
  resetTokenExpires: new Date(),
  kycStatus: 'approved',
  kycFullName: 'Trader Name',
  kycIdType: 'nin',
  kycIdNumber: '123',
  kycIdUrl: 'https://example.com/id',
  kycAddress: 'Lagos',
  kycSelfieUrl: null,
  kycSubmittedAt: new Date(),
  createdAt: new Date(),
} satisfies Trader;

describe('mapTraderForPartnerAdmin', () => {
  it('omits sensitive trader fields', () => {
    const mapped = mapTraderForPartnerAdmin(sampleTrader);
    expect(mapped).not.toHaveProperty('password_hash');
    expect(mapped).not.toHaveProperty('reset_token');
    expect(mapped).not.toHaveProperty('reset_token_expires');
    expect(mapped.email).toBe('trader@example.com');
  });

  it('keeps sensitive fields on full mapTrader', () => {
    const mapped = mapTrader(sampleTrader);
    expect(mapped.password_hash).toBe('hash');
    expect(mapped.reset_token).toBe('reset');
  });
});

describe('partner admin pin crypto', () => {
  it('hashes and verifies partner pins', async () => {
    const hashed = await hashPartnerAdminPin('482913');
    await expect(verifyPartnerAdminPin(hashed, '482913')).resolves.toBe(true);
    await expect(verifyPartnerAdminPin(hashed, '000000')).resolves.toBe(false);
  });

  it('rejects legacy plaintext pins', async () => {
    await expect(verifyPartnerAdminPin('123456', '123456')).resolves.toBe(false);
  });
});

describe('partner admin session', () => {
  it('creates and verifies a signed session token', () => {
    const token = createPartnerAdminSessionToken({ partnerId: 9, slug: 'acme' });
    const session = verifyPartnerAdminSessionToken(token);
    expect(session?.partnerId).toBe(9);
    expect(session?.slug).toBe('acme');
  });

  it('creates a read-only session with 1-hour expiry', () => {
    const token = createPartnerAdminSessionToken({
      partnerId: 9,
      slug: 'acme',
      mode: 'readonly',
    });
    const session = verifyPartnerAdminSessionToken(token);
    expect(session?.mode).toBe('readonly');
    expect(session?.exp).toBeGreaterThan(Date.now());
    expect(session?.exp).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000 + 1000);
  });

  it('omits mode on PIN sessions', () => {
    const token = createPartnerAdminSessionToken({ partnerId: 9, slug: 'acme' });
    const session = verifyPartnerAdminSessionToken(token);
    expect(session?.mode).toBeUndefined();
  });
});

function sessionRequest(slug: string, mode?: 'readonly') {
  const token = createPartnerAdminSessionToken({
    partnerId: 9,
    slug,
    ...(mode ? { mode } : {}),
  });
  const cookie = createPartnerAdminSessionCookie(slug, token, {
    maxAge: mode === 'readonly' ? 60 * 60 : undefined,
  });
  const value = cookie.split(';')[0];
  return new Request('https://acme.ft9ja.com/admin', {
    headers: { cookie: value },
  });
}

describe('partner admin auth guard', () => {
  it('marks PIN sessions as writable', async () => {
    primeSessionsRevokedAtCache(0);
    const auth = await requirePartnerAdmin(sessionRequest('acme'), 'acme');
    expect(isPartnerAdminUnauthorized(auth)).toBe(false);
    if (isPartnerAdminUnauthorized(auth)) return;
    expect(auth.readOnly).toBe(false);
    const write = await requirePartnerAdminWrite(sessionRequest('acme'), 'acme');
    expect(isPartnerAdminUnauthorized(write)).toBe(false);
  });

  it('forbids writes for read-only sessions', async () => {
    primeSessionsRevokedAtCache(0);
    const auth = await requirePartnerAdmin(sessionRequest('acme', 'readonly'), 'acme');
    expect(isPartnerAdminUnauthorized(auth)).toBe(false);
    if (isPartnerAdminUnauthorized(auth)) return;
    expect(auth.readOnly).toBe(true);
    const write = await requirePartnerAdminWrite(sessionRequest('acme', 'readonly'), 'acme');
    expect(write).toBeInstanceOf(Response);
    if (!(write instanceof Response)) return;
    expect(write.status).toBe(403);
  });
});

describe('trader setup token', () => {
  it('creates and verifies setup tokens', () => {
    const token = createTraderSetupToken({
      traderId: 4,
      partnerId: 2,
      email: 'trader@example.com',
      slug: 'acme',
    });
    const payload = verifyTraderSetupToken(token);
    expect(payload?.traderId).toBe(4);
    expect(payload?.email).toBe('trader@example.com');
  });
});

describe('rate limit', () => {
  it('blocks after max attempts', () => {
    const key = 'test-key';
    resetRateLimit(key);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false);
    resetRateLimit(key);
  });
});
