import {
  getPartnerForPinReset,
  setPartnerPinResetOtp,
} from '@/db/queries/partners';
import { parseJsonBody } from '@/lib/api-validation';
import { partnerForgotPinSchema } from '@/lib/api-schemas';
import { sendPartnerPinResetEmail } from '@/lib/email/ft9ja-to-partner';
import {
  checkRateLimit,
  getRequestRateLimitKey,
} from '@/lib/rate-limit';
import {
  generatePartnerPinOtp,
  hashPartnerPinOtp,
  partnerPinOtpExpiresAt,
} from '@/lib/partner-pin-reset';

const MAX_OTP_REQUESTS = 3;
const OTP_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = await parseJsonBody(request, partnerForgotPinSchema);
    if (!parsed.ok) return parsed.response;

    const { email } = parsed.data;
    const rateKey = `${getRequestRateLimitKey(request, 'partner-forgot-pin')}:${slug}:${email}`;
    const limited = checkRateLimit(rateKey, MAX_OTP_REQUESTS, OTP_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSeconds) },
        }
      );
    }

    const partner = await getPartnerForPinReset(slug, email);
    if (partner) {
      const otp = generatePartnerPinOtp();
      const otpHash = await hashPartnerPinOtp(otp);
      await setPartnerPinResetOtp(slug, otpHash, partnerPinOtpExpiresAt());

      try {
        await sendPartnerPinResetEmail(
          {
            slug,
            firm_name: partner.firm_name,
            owner_email: partner.owner_email,
          },
          { otp }
        );
      } catch (emailErr) {
        console.error('Failed to send partner PIN reset email:', emailErr);
      }
    }

    return Response.json({
      success: true,
      message: 'If an account exists for that email, a reset code has been sent.',
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
