import { getPartnerIdBySlug } from '@/db/queries/partners';
import { createTraderWithCount, traderEmailExists } from '@/db/queries/traders';
import argon2 from 'argon2';
import {
  createSessionToken,
} from '@/app/api/utils/session';
import {
  checkRateLimit,
  getRequestRateLimitKey,
} from '@/lib/rate-limit';
import { buildTraderSessionCookie } from '@/lib/trader-session-cookie';

const SEVEN_DAYS = 7 * 24 * 3600;
const MAX_REGISTER_ATTEMPTS = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return Response.json({ error: 'name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const rateKey = `${getRequestRateLimitKey(request, 'trader-register')}:${slug}`;
    const limited = checkRateLimit(rateKey, MAX_REGISTER_ATTEMPTS, REGISTER_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    if (await traderEmailExists(partnerId, email)) {
      return Response.json({ error: 'A trader with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await argon2.hash(password);
    const trader = await createTraderWithCount({
      partnerId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
    });

    const token = createSessionToken({
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    });

    const res = Response.json(
      {
        success: true,
        trader: { id: trader.id, name: trader.name, email: trader.email },
      },
      { status: 201 }
    );
    res.headers.set('Set-Cookie', buildTraderSessionCookie(slug, token));
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Registration failed' }, { status: 500 });
  }
}
