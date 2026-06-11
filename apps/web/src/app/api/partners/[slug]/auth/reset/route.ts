import { getPartnerIdBySlug, getPartnerWithPinBySlug } from '@/db/queries/partners';
import {
  completePasswordReset,
  getTraderByResetToken,
  getTraderForReset,
  setTraderResetToken,
} from '@/db/queries/traders';
import argon2 from 'argon2';
import crypto from 'crypto';
import { sendEmail } from '@/app/api/utils/send-email';
import { getPartnerUrl } from '@/lib/tenant';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    const partner = await getPartnerWithPinBySlug(slug);
    if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const trader = await getTraderForReset(partner.id, email);

    if (!trader) return Response.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000);

    await setTraderResetToken(trader.id, token, expires);

    const resetUrl = getPartnerUrl(
      slug,
      `/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    );

    try {
      await sendEmail({
        to: email,
        from: 'FT9ja <onboarding@resend.dev>',
        subject: `Reset your ${partner.firm_name} password`,
        text: `Reset your ${partner.firm_name} password: ${resetUrl}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="font-size:20px;font-weight:900;color:#111;margin-bottom:8px">Password Reset</h2>
            <p style="color:#555;font-size:14px">Hi ${trader.name},</p>
            <p style="color:#555;font-size:14px">
              Click the button below to reset your password for <strong>${partner.firm_name}</strong>.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#16A34A;color:#fff;font-weight:700;border-radius:8px;text-decoration:none;font-size:14px">
              Reset My Password
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px">
              If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
            <p style="color:#ccc;font-size:11px">Powered by FT9ja</p>
          </div>
        `,
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

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const trader = await getTraderByResetToken(partnerId, email, token);
    if (!trader) {
      return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const hash = await argon2.hash(password);
    await completePasswordReset(trader.id, hash);

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
