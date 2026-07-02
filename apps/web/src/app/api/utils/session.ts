import crypto from 'crypto';
import { getTraderSessionSecret } from '@/lib/auth-secret';
import { isSessionIssuedBeforeRevocation } from '@/lib/session-revocation';

export interface TraderSession {
  traderId: number;
  partnerId: number;
  slug: string;
  iat: number;
  exp: number;
}

export function createSessionToken(payload: Omit<TraderSession, 'iat' | 'exp'> & { exp: number }): string {
  const data = JSON.stringify({ ...payload, iat: Date.now() } satisfies TraderSession);
  const encoded = Buffer.from(data).toString('base64');
  const sig = crypto.createHmac('sha256', getTraderSessionSecret()).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): TraderSession | null {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return null;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = crypto.createHmac('sha256', getTraderSessionSecret()).update(encoded).digest('hex');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString()) as TraderSession;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionCookieName(slug: string): string {
  return `ft9ja_trader_${slug}`;
}

export async function parseSessionFromRequest(
  request: Request,
  slug: string
): Promise<TraderSession | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName(slug);
  const pairs = cookieHeader.split(';').map((c) => c.trim());
  const match = pairs.find((c) => c.startsWith(`${cookieName}=`));
  if (!match) return null;
  const token = match.slice(cookieName.length + 1);
  const session = verifySessionToken(token);
  if (!session) return null;
  if (await isSessionIssuedBeforeRevocation(session.iat)) return null;
  return session;
}
