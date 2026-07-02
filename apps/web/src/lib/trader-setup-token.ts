import crypto from 'crypto';
import { getTraderSetupTokenSecret } from '@/lib/auth-secret';

const SETUP_TOKEN_MAX_AGE = 60 * 60;

export interface TraderSetupTokenPayload {
  traderId: number;
  partnerId: number;
  email: string;
  slug: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getTraderSetupTokenSecret()).update(encoded).digest('hex');
}

export function createTraderSetupToken(payload: Omit<TraderSetupTokenPayload, 'exp'>) {
  const encoded = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + SETUP_TOKEN_MAX_AGE * 1000,
    })
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyTraderSetupToken(token: string): TraderSetupTokenPayload | null {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return null;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = sign(encoded);
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as TraderSetupTokenPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
