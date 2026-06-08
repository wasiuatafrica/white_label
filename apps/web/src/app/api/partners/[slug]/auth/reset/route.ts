import sql from '@/app/api/utils/sql';
import argon2 from 'argon2';
import crypto from 'crypto';
import { sendEmail } from '@/app/api/utils/send-email';

// POST — request a password reset link via email
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    const partners = await sql`SELECT id, firm_name FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partners.length === 0)
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    const partner = partners[0];

    const traders = await sql`
      SELECT id, name FROM traders
      WHERE email = ${email} AND partner_id = ${partner.id} LIMIT 1
    `;

    // Always return success to avoid email enumeration
    if (traders.length === 0) return Response.json({ success: true });

    const trader = traders[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await sql`UPDATE traders SET reset_token = ${token}, reset_token_expires = ${expires} WHERE id = ${trader.id}`;

    const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || '';
    const resetUrl = `${appUrl}/${slug}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await sendEmail({
        to: email,
        from: 'FT9ja <onboarding@resend.dev>',
        subject: `Reset your ${partner.firm_name} password`,
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

// PUT — confirm reset with token + set new password
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

    const partners = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partners.length === 0)
      return Response.json({ error: 'Partner not found' }, { status: 404 });

    const traders = await sql`
      SELECT id FROM traders
      WHERE email = ${email}
        AND partner_id = ${partners[0].id}
        AND reset_token = ${token}
        AND reset_token_expires > NOW()
      LIMIT 1
    `;
    if (traders.length === 0) {
      return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const hash = await argon2.hash(password);
    await sql`
      UPDATE traders SET password_hash = ${hash}, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ${traders[0].id}
    `;

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
