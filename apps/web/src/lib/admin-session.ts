import crypto from 'crypto';
import { getAdminSessionSecret } from '@/lib/auth-secret';
import { isSessionIssuedBeforeRevocation } from '@/lib/session-revocation';

export const ADMIN_SESSION_COOKIE = 'ft9ja_admin_session';
export const ADMIN_PENDING_COOKIE = 'ft9ja_admin_pending';

export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
export const ADMIN_PENDING_MAX_AGE = 60 * 5;

export interface AdminSessionPayload {
  adminUserId: number;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export type AdminPendingPurpose = 'totp_verify' | 'totp_setup';

export interface AdminPendingPayload {
  adminUserId: number;
  purpose: AdminPendingPurpose;
  iat: number;
  exp: number;
}

function sign(encoded: string) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(encoded).digest('hex');
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

export function createAdminSessionToken(payload: Omit<AdminSessionPayload, 'iat' | 'exp'>) {
  return createSignedToken<AdminSessionPayload>({
    ...payload,
    exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  });
}

export function verifyAdminSessionToken(token: string) {
  return verifySignedToken<AdminSessionPayload>(token);
}

export function createAdminPendingToken(
  adminUserId: number,
  purpose: AdminPendingPurpose
) {
  return createSignedToken<AdminPendingPayload>({
    adminUserId,
    purpose,
    exp: Date.now() + ADMIN_PENDING_MAX_AGE * 1000,
  });
}

export function verifyAdminPendingToken(token: string) {
  return verifySignedToken<AdminPendingPayload>(token);
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

export function createAdminSessionCookie(token: string, options: { secure?: boolean } = {}) {
  return buildCookie(
    ADMIN_SESSION_COOKIE,
    token,
    ADMIN_SESSION_MAX_AGE,
    options.secure ?? process.env.NODE_ENV === 'production'
  );
}

export function clearAdminSessionCookie(options: { secure?: boolean } = {}) {
  return buildCookie(ADMIN_SESSION_COOKIE, '', 0, options.secure ?? process.env.NODE_ENV === 'production');
}

export function createAdminPendingCookie(token: string, options: { secure?: boolean } = {}) {
  return buildCookie(
    ADMIN_PENDING_COOKIE,
    token,
    ADMIN_PENDING_MAX_AGE,
    options.secure ?? process.env.NODE_ENV === 'production'
  );
}

export function clearAdminPendingCookie(options: { secure?: boolean } = {}) {
  return buildCookie(ADMIN_PENDING_COOKIE, '', 0, options.secure ?? process.env.NODE_ENV === 'production');
}

export async function parseAdminSessionFromRequest(request: Request) {
  const token = parseCookies(request.headers.get('cookie')).get(ADMIN_SESSION_COOKIE);
  if (!token) return null;
  const session = verifyAdminSessionToken(token);
  if (!session) return null;
  if (await isSessionIssuedBeforeRevocation(session.iat)) return null;
  return session;
}

export async function parseAdminPendingFromRequest(request: Request) {
  const token = parseCookies(request.headers.get('cookie')).get(ADMIN_PENDING_COOKIE);
  if (!token) return null;
  const pending = verifyAdminPendingToken(token);
  if (!pending) return null;
  if (await isSessionIssuedBeforeRevocation(pending.iat)) return null;
  return pending;
}
