import { describe, expect, it } from 'vitest';
import { mapTrader, mapTraderForPartnerAdmin } from '@/db/mappers';
import type { Trader } from '@/db/schema/traders';
import {
  hashPartnerAdminPin,
  verifyPartnerAdminPin,
} from '@/lib/partner-pin-crypto';
import {
  createPartnerAdminSessionToken,
  verifyPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';
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
