import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_SESSION_COOKIE = 'ft9ja_admin_session';
const ADMIN_SESSION_VALUE = 'admin';
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function signAdminSession(secret: string) {
  return createHmac('sha256', secret).update(ADMIN_SESSION_VALUE).digest('hex');
}

function timingSafeStringEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
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

export function createAdminSessionCookie(secret: string, options: { secure?: boolean } = {}) {
  const value = `${ADMIN_SESSION_VALUE}.${signAdminSession(secret)}`;
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ADMIN_SESSION_MAX_AGE}`,
  ];

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function requestHasAdminSession(request: Request, secret: string) {
  const value = parseCookies(request.headers.get('cookie')).get(ADMIN_SESSION_COOKIE);
  if (!value) return false;

  const [payload, signature] = value.split('.');
  if (payload !== ADMIN_SESSION_VALUE || !signature) return false;

  return timingSafeStringEqual(signature, signAdminSession(secret));
}
