import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';
import { consumeOneShot, createJti, issueOneShot } from '@/lib/one-shot';

const VIEW_TOKEN_MAX_AGE_MS = 60 * 1000;
const SCOPE = 'admin-trader-view';

export interface AdminTraderViewTokenPayload {
  slug: string;
  email: string;
  adminUserId: number;
  jti: string;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
}

export async function createAdminTraderViewToken(payload: {
  slug: string;
  email: string;
  adminUserId: number;
}) {
  const jti = createJti();
  const issued = await issueOneShot(SCOPE, jti, VIEW_TOKEN_MAX_AGE_MS);
  if (!issued) return null;
  const encoded = Buffer.from(
    JSON.stringify({
      slug: payload.slug,
      email: payload.email.trim().toLowerCase(),
      adminUserId: payload.adminUserId,
      jti,
      exp: Date.now() + VIEW_TOKEN_MAX_AGE_MS,
    } satisfies AdminTraderViewTokenPayload)
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminTraderViewToken(
  token: string,
  slug: string,
  email: string
): AdminTraderViewTokenPayload | null {
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
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    ) as AdminTraderViewTokenPayload;
    if (parsed.exp < Date.now()) return null;
    if (!parsed.jti || !Number.isInteger(parsed.adminUserId)) return null;
    if (parsed.slug !== slug || parsed.email !== email.trim().toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function consumeAdminTraderViewToken(
  token: string,
  slug: string,
  email: string
) {
  const parsed = verifyAdminTraderViewToken(token, slug, email);
  if (!parsed) return null;
  const consumed = await consumeOneShot(SCOPE, parsed.jti);
  if (!consumed) return null;
  return parsed;
}
