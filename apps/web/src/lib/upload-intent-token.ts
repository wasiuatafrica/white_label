import crypto from 'crypto';
import { getTraderSetupTokenSecret } from '@/lib/auth-secret';
import { consumeOneShot, createJti, issueOneShot } from '@/lib/one-shot';

const UPLOAD_INTENT_MAX_AGE_MS = 5 * 60 * 1000;
const SCOPE = 'upload-intent';

export type UploadIntentPurpose = 'partner_apply' | 'guest_checkout';

export interface UploadIntentPayload {
  purpose: UploadIntentPurpose;
  slug?: string;
  attemptId?: string;
  jti: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getTraderSetupTokenSecret()).update(encoded).digest('hex');
}

export async function createUploadIntentToken(
  payload: Omit<UploadIntentPayload, 'exp' | 'jti'>
): Promise<string | null> {
  const jti = createJti();
  const issued = await issueOneShot(SCOPE, jti, UPLOAD_INTENT_MAX_AGE_MS);
  if (!issued) return null;
  const encoded = Buffer.from(
    JSON.stringify({
      ...payload,
      jti,
      exp: Date.now() + UPLOAD_INTENT_MAX_AGE_MS,
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
    if (parsed.exp < Date.now() || !parsed.jti) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function consumeUploadIntentToken(token: string) {
  const parsed = verifyUploadIntentToken(token);
  if (!parsed) return null;
  const consumed = await consumeOneShot(SCOPE, parsed.jti);
  if (!consumed) return null;
  return parsed;
}
