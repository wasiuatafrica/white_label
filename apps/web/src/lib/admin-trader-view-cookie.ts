import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';

export const ADMIN_TRADER_VIEW_COOKIE_PREFIX = 'ft9ja_admin_trader_view_';
const MAX_AGE_MS = 60 * 60 * 1000;

interface TraderViewCookiePayload {
  slug: string;
  email: string;
  adminUserId: number;
  exp: number;
}

function cookieName(slug: string) {
  return `${ADMIN_TRADER_VIEW_COOKIE_PREFIX}${slug}`;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
}

export function createAdminTraderViewCookie(slug: string, email: string, adminUserId: number) {
  const encoded = Buffer.from(
    JSON.stringify({
      slug,
      email: email.trim().toLowerCase(),
      adminUserId,
      exp: Date.now() + MAX_AGE_MS,
    } satisfies TraderViewCookiePayload)
  ).toString('base64url');
  const token = `${encoded}.${sign(encoded)}`;
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${cookieName(slug)}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function readAdminTraderViewCookie(request: Request, slug: string, email: string) {
  const name = cookieName(slug);
  const cookies = (request.headers.get('cookie') || '').split(';');
  const match = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(name.length + 1));
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return null;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = sign(encoded);
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as TraderViewCookiePayload;
    if (parsed.exp < Date.now()) return null;
    if (parsed.slug !== slug || parsed.email !== email.trim().toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}
