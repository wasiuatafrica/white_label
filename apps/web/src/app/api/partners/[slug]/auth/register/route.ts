import { getPartnerIdBySlug } from '@/db/queries/partners';
import { createTraderWithCount, getTraderEmailOwner } from '@/db/queries/traders';
import argon2 from 'argon2';
import {
  createSessionToken,
} from '@/app/api/utils/session';
import {
  checkRateLimit,
  getRequestRateLimitKey,
} from '@/lib/rate-limit';
import { buildTraderSessionCookie } from '@/lib/trader-session-cookie';
import { parseJsonBody } from '@/lib/api-validation';
import { traderRegisterSchema } from '@/lib/api-schemas';
import { isUniqueViolation } from '@/lib/db-errors';
import { traderEmailConflictMessage } from '@/lib/trader-email';
import {
  assertPartnerStorefrontOpen,
  PartnerStorefrontFrozenError,
  partnerStorefrontFrozenResponse,
} from '@/lib/partner-storefront-access';

const SEVEN_DAYS = 7 * 24 * 3600;
const MAX_REGISTER_ATTEMPTS = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  let partnerId: number | null = null;
  let email = '';

  try {
    const { slug } = await params;
    const parsed = await parseJsonBody(request, traderRegisterSchema);
    if (!parsed.ok) return parsed.response;

    const { name, password } = parsed.data;
    email = parsed.data.email;

    const rateKey = `${getRequestRateLimitKey(request, 'trader-register')}:${slug}`;
    const limited = checkRateLimit(rateKey, MAX_REGISTER_ATTEMPTS, REGISTER_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    await assertPartnerStorefrontOpen(slug);

    const existing = await getTraderEmailOwner(email);
    if (existing) {
      return Response.json(
        { error: traderEmailConflictMessage(existing.partnerId, partnerId) },
        { status: 409 }
      );
    }

    const passwordHash = await argon2.hash(password);
    const trader = await createTraderWithCount({
      partnerId,
      name,
      email,
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
    if (e instanceof PartnerStorefrontFrozenError) {
      return partnerStorefrontFrozenResponse();
    }
    if (isUniqueViolation(e)) {
      const existing = email ? await getTraderEmailOwner(email) : null;
      const message =
        existing && partnerId
          ? traderEmailConflictMessage(existing.partnerId, partnerId)
          : 'A trader with this email already exists.';
      return Response.json({ error: message }, { status: 409 });
    }
    return Response.json({ error: 'Registration failed' }, { status: 500 });
  }
}
