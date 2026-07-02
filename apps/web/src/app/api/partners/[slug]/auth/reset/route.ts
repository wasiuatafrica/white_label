import { getPartnerBySlug, getPartnerIdBySlug } from '@/db/queries/partners';
import {
  completePasswordReset,
  getTraderByResetToken,
  getTraderForReset,
  setTraderResetToken,
} from '@/db/queries/traders';
import argon2 from 'argon2';
import crypto from 'crypto';
import {
  checkRateLimit,
  getRequestRateLimitKey,
  resetRateLimit,
} from '@/lib/rate-limit';
import { sendTraderPasswordResetEmail } from '@/lib/email/partner-to-trader';
import { getPartnerUrl } from '@/lib/tenant';

const MAX_RESET_EMAIL_REQUESTS = 5;
const MAX_RESET_ATTEMPTS = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
    const normalizedEmail = String(email).trim().toLowerCase();

    const rateKey = `${getRequestRateLimitKey(request, 'trader-password-reset-email')}:${slug}:${normalizedEmail}`;
    const limited = checkRateLimit(rateKey, MAX_RESET_EMAIL_REQUESTS, RESET_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many password reset requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const partner = await getPartnerBySlug(slug);
    if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const trader = await getTraderForReset(partner.id, normalizedEmail);

    if (!trader) return Response.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000);

    await setTraderResetToken(trader.id, token, expires);

    const resetUrl = getPartnerUrl(
      slug,
      `/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
    );

    try {
      await sendTraderPasswordResetEmail({
        to: normalizedEmail,
        traderName: trader.name,
        firmName: partner.firm_name,
        slug,
        brandColor: partner.brand_color,
        resetUrl,
      });
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return Response.json({ error: 'token, email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const rateKey = `${getRequestRateLimitKey(request, 'trader-password-reset-complete')}:${slug}:${normalizedEmail}`;
    const limited = checkRateLimit(rateKey, MAX_RESET_ATTEMPTS, RESET_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many reset attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const trader = await getTraderByResetToken(partnerId, normalizedEmail, token);
    if (!trader) {
      return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const hash = await argon2.hash(password);
    await completePasswordReset(trader.id, hash);
    resetRateLimit(rateKey);

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
