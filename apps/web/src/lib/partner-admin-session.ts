import crypto from 'crypto';
import { getPartnerAdminSessionSecret } from '@/lib/auth-secret';
import { isSessionIssuedBeforeRevocation } from '@/lib/session-revocation';

export const PARTNER_ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
export const PARTNER_ADMIN_VIEW_SESSION_MAX_AGE = 60 * 60;

export interface PartnerAdminSessionPayload {
  partnerId: number;
  slug: string;
  mode?: 'readonly';
  iat: number;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getPartnerAdminSessionSecret()).update(encoded).digest('hex');
}

function createSignedToken<T extends { iat: number; exp: number }>(
  payload: Omit<T, 'iat' | 'exp'> & { exp: number }
): string {
  const encoded = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() } as T)).toString(
    'base64url'
  );
  return `${encoded}.${sign(encoded)}`;
}

function verifySignedToken<T extends { iat?: number; exp: number }>(token: string): T | null {
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
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as T;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getPartnerAdminCookieName(slug: string) {
  return `ft9ja_partner_admin_${slug}`;
}

export function createPartnerAdminSessionToken(
  payload: Omit<PartnerAdminSessionPayload, 'iat' | 'exp'>
) {
  const maxAge =
    payload.mode === 'readonly'
      ? PARTNER_ADMIN_VIEW_SESSION_MAX_AGE
      : PARTNER_ADMIN_SESSION_MAX_AGE;
  return createSignedToken<PartnerAdminSessionPayload>({
    partnerId: payload.partnerId,
    slug: payload.slug,
    ...(payload.mode === 'readonly' ? { mode: 'readonly' as const } : {}),
    exp: Date.now() + maxAge * 1000,
  });
}

export function verifyPartnerAdminSessionToken(token: string) {
  return verifySignedToken<PartnerAdminSessionPayload>(token);
}

function parseCookies(cookieHeader: string | null) {
  const cookies = new Map<string, string>();
  for (const part of (cookieHeader || '').split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    cookies.set(rawName, decodeURIComponent(rawValue.join('=')));
  }
  return cookies;
}

function buildCookie(name: string, value: string, maxAge: number, secure: boolean) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function createPartnerAdminSessionCookie(
  slug: string,
  token: string,
  options: { secure?: boolean; maxAge?: number } = {}
) {
  return buildCookie(
    getPartnerAdminCookieName(slug),
    token,
    options.maxAge ?? PARTNER_ADMIN_SESSION_MAX_AGE,
    options.secure ?? process.env.NODE_ENV === 'production'
  );
}

export function clearPartnerAdminSessionCookie(
  slug: string,
  options: { secure?: boolean } = {}
) {
  return buildCookie(
    getPartnerAdminCookieName(slug),
    '',
    0,
    options.secure ?? process.env.NODE_ENV === 'production'
  );
}

export async function parsePartnerAdminSessionFromRequest(request: Request, slug: string) {
  const token = parseCookies(request.headers.get('cookie')).get(getPartnerAdminCookieName(slug));
  if (!token) return null;
  const session = verifyPartnerAdminSessionToken(token);
  if (!session || session.slug !== slug) return null;
  if (await isSessionIssuedBeforeRevocation(session.iat)) return null;
  return session;
}
