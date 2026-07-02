import { getSessionCookieName } from '@/app/api/utils/session';

const SEVEN_DAYS = 7 * 24 * 3600;

export function buildTraderSessionCookie(slug: string, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${getSessionCookieName(slug)}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SEVEN_DAYS}${secure}`;
}

export function clearTraderSessionCookie(slug: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${getSessionCookieName(slug)}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
