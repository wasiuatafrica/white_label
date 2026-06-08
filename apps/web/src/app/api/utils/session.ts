import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || 'ft9ja-fallback-secret';

export interface TraderSession {
  traderId: number;
  partnerId: number;
  slug: string;
  exp: number;
}

export function createSessionToken(payload: TraderSession): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): TraderSession | null {
  try {
    const lastDot = token.lastIndexOf('.');
    if (lastDot < 0) return null;
    const encoded = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
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

export function parseSessionFromRequest(request: Request, slug: string): TraderSession | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieName = getSessionCookieName(slug);
  const pairs = cookieHeader.split(';').map((c) => c.trim());
  const match = pairs.find((c) => c.startsWith(`${cookieName}=`));
  if (!match) return null;
  const token = match.slice(cookieName.length + 1);
  return verifySessionToken(token);
}
