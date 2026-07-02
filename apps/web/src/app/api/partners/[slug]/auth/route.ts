import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  getTraderForLogin,
  getTraderForPasswordSetup,
  getTraderForSession,
  setTraderPassword,
} from '@/db/queries/traders';
import argon2 from 'argon2';
import {
  createSessionToken,
  parseSessionFromRequest,
  getSessionCookieName,
} from '@/app/api/utils/session';
import {
  checkRateLimit,
  getRequestRateLimitKey,
  resetRateLimit,
} from '@/lib/rate-limit';
import { createTraderSetupToken, verifyTraderSetupToken } from '@/lib/trader-setup-token';

const SEVEN_DAYS = 7 * 24 * 3600;
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ session: null }, { status: 401 });

    const trader = await getTraderForSession(session.traderId, session.partnerId);
    if (!trader) return Response.json({ session: null }, { status: 401 });

    return Response.json({ session, trader });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Session check failed' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const rateKey = `${getRequestRateLimitKey(request, 'trader-login')}:${slug}:${String(email).toLowerCase()}`;
    const limited = checkRateLimit(rateKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many login attempts. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSeconds) },
        }
      );
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const trader = await getTraderForLogin(partnerId, email);
    if (!trader) return Response.json({ error: 'no_account' }, { status: 401 });

    if (!trader.password_hash) {
      const setupToken = createTraderSetupToken({
        traderId: trader.id,
        partnerId,
        email: trader.email,
        slug,
      });
      return Response.json(
        { error: 'no_password', traderId: trader.id, setup_token: setupToken },
        { status: 401 }
      );
    }

    const valid = await argon2.verify(trader.password_hash, password);
    if (!valid) return Response.json({ error: 'invalid_password' }, { status: 401 });

    resetRateLimit(rateKey);

    const token = createSessionToken({
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    });
    const cookieName = getSessionCookieName(slug);

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set(
      'Set-Cookie',
      `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SEVEN_DAYS}`
    );
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email, traderId, password, setup_token } = body;

    if (!password || password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (!setup_token || typeof setup_token !== 'string') {
      return Response.json({ error: 'setup_token is required' }, { status: 400 });
    }

    const tokenPayload = verifyTraderSetupToken(setup_token);
    if (
      !tokenPayload ||
      tokenPayload.slug !== slug ||
      tokenPayload.traderId !== Number(traderId) ||
      tokenPayload.email !== email
    ) {
      return Response.json({ error: 'Invalid or expired setup token' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== tokenPayload.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const trader = await getTraderForPasswordSetup(traderId, email, partnerId);
    if (!trader) {
      return Response.json({ error: 'Invalid request or password already set' }, { status: 400 });
    }

    const hash = await argon2.hash(password);
    await setTraderPassword(trader.id, hash);

    const sessionToken = createSessionToken({
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    });
    const cookieName = getSessionCookieName(slug);

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set(
      'Set-Cookie',
      `${cookieName}=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SEVEN_DAYS}`
    );
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to set password' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieName = getSessionCookieName(slug);
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  return res;
}
