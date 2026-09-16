import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';

export const PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE = 60 * 60;

export interface AdminPartnerAdminViewTokenPayload {
  slug: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
}

export function createAdminPartnerAdminViewToken(payload: { slug: string }) {
  const encoded = Buffer.from(
    JSON.stringify({
      slug: payload.slug,
      exp: Date.now() + PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE * 1000,
    } satisfies AdminPartnerAdminViewTokenPayload)
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminPartnerAdminViewToken(token: string, slug: string): boolean {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return false;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = sign(encoded);
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return false;
    }
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    ) as AdminPartnerAdminViewTokenPayload;
    if (parsed.exp < Date.now()) return false;
    return parsed.slug === slug;
  } catch {
    return false;
  }
}
