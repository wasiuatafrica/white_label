import crypto from 'crypto';
import { getTraderSetupTokenSecret } from '@/lib/auth-secret';

const UPLOAD_INTENT_MAX_AGE = 30 * 60;

export type UploadIntentPurpose = 'partner_apply' | 'guest_checkout';

export interface UploadIntentPayload {
  purpose: UploadIntentPurpose;
  slug?: string;
  attemptId?: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getTraderSetupTokenSecret()).update(encoded).digest('hex');
}

export function createUploadIntentToken(
  payload: Omit<UploadIntentPayload, 'exp'>
): string {
  const encoded = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + UPLOAD_INTENT_MAX_AGE * 1000,
    })
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyUploadIntentToken(token: string): UploadIntentPayload | null {
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
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as UploadIntentPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
