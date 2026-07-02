import { getPartnerIdBySlug, getPartnerWithPinBySlug } from '@/db/queries/partners';
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
} from '@/app/api/utils/session';
import {
  checkRateLimit,
  getRequestRateLimitKey,
  resetRateLimit,
} from '@/lib/rate-limit';
import { createTraderSetupToken, verifyTraderSetupToken } from '@/lib/trader-setup-token';
import { buildTraderSessionCookie, clearTraderSessionCookie } from '@/lib/trader-session-cookie';
import { sendEmail } from '@/app/api/utils/send-email';
import { getPartnerUrl } from '@/lib/tenant';
import { parseJsonBody } from '@/lib/api-validation';
import { traderLoginSchema, traderSetPasswordSchema } from '@/lib/api-schemas';

const SEVEN_DAYS = 7 * 24 * 3600;
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const INVALID_LOGIN = 'Invalid email or password.';

async function sendTraderPasswordSetupEmail(options: {
  slug: string;
  firmName: string;
  traderName: string;
  email: string;
  setupToken: string;
}) {
  const setupUrl = getPartnerUrl(
    options.slug,
    `/set-password?token=${encodeURIComponent(options.setupToken)}&email=${encodeURIComponent(options.email)}`
  );

  await sendEmail({
    to: options.email,
    subject: `Set your ${options.firmName} password`,
    text: `Set your ${options.firmName} password: ${setupUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="font-size:20px;font-weight:900;color:#111;margin-bottom:8px">Set Your Password</h2>
        <p style="color:#555;font-size:14px">Hi ${options.traderName},</p>
        <p style="color:#555;font-size:14px">
          Finish setting up your account for <strong>${options.firmName}</strong>.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${setupUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#16A34A;color:#fff;font-weight:700;border-radius:8px;text-decoration:none;font-size:14px">
          Set My Password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          If you did not request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}

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
    const parsed = await parseJsonBody(request, traderLoginSchema);
    if (!parsed.ok) return parsed.response;

    const { email: normalizedEmail, password } = parsed.data;
    const rateKey = `${getRequestRateLimitKey(request, 'trader-login')}:${slug}:${normalizedEmail}`;
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

    const partner = await getPartnerWithPinBySlug(slug);
    const trader = await getTraderForLogin(partnerId, normalizedEmail);
    if (!trader) {
      return Response.json({ error: INVALID_LOGIN }, { status: 401 });
    }

    if (!trader.password_hash) {
      const setupToken = createTraderSetupToken({
        traderId: trader.id,
        partnerId,
        email: trader.email,
        slug,
      });

      try {
        await sendTraderPasswordSetupEmail({
          slug,
          firmName: partner?.firm_name || slug,
          traderName: trader.name,
          email: trader.email,
          setupToken,
        });
      } catch (emailErr) {
        console.error('Failed to send password setup email:', emailErr);
      }

      return Response.json(
        {
          error: INVALID_LOGIN,
          message: 'If an account exists, check your email for next steps.',
        },
        { status: 401 }
      );
    }

    const valid = await argon2.verify(trader.password_hash, password);
    if (!valid) return Response.json({ error: INVALID_LOGIN }, { status: 401 });

    resetRateLimit(rateKey);

    const token = createSessionToken({
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    });

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set('Set-Cookie', buildTraderSessionCookie(slug, token));
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = await parseJsonBody(request, traderSetPasswordSchema);
    if (!parsed.ok) return parsed.response;

    const { email, password, setup_token: setupToken } = parsed.data;

    const tokenPayload = verifyTraderSetupToken(setupToken);
    if (!tokenPayload || tokenPayload.slug !== slug) {
      return Response.json({ error: 'Invalid or expired setup token' }, { status: 400 });
    }

    const normalizedEmail = String(email || tokenPayload.email).trim().toLowerCase();
    if (tokenPayload.email !== normalizedEmail) {
      return Response.json({ error: 'Invalid or expired setup token' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== tokenPayload.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const trader = await getTraderForPasswordSetup(
      tokenPayload.traderId,
      tokenPayload.email,
      partnerId
    );
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

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set('Set-Cookie', buildTraderSessionCookie(slug, sessionToken));
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to set password' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', clearTraderSessionCookie(slug));
  return res;
}
