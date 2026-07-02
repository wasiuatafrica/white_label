import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';

const VIEW_TOKEN_MAX_AGE = 60 * 60;

export interface AdminTraderViewTokenPayload {
  slug: string;
  email: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
}

export function createAdminTraderViewToken(payload: Omit<AdminTraderViewTokenPayload, 'exp'>) {
  const encoded = Buffer.from(
    JSON.stringify({
      ...payload,
      email: payload.email.trim().toLowerCase(),
      exp: Date.now() + VIEW_TOKEN_MAX_AGE * 1000,
    })
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminTraderViewToken(
  token: string,
  slug: string,
  email: string
): boolean {
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
    ) as AdminTraderViewTokenPayload;
    if (parsed.exp < Date.now()) return false;
    return (
      parsed.slug === slug &&
      parsed.email === email.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}
