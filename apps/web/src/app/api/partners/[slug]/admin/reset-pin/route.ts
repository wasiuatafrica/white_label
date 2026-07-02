import {
  clearPartnerPinResetOtp,
  getPartnerForPinReset,
  getPartnerPinResetOtp,
  updatePartnerAdminPin,
} from '@/db/queries/partners';
import { parseJsonBody } from '@/lib/api-validation';
import { partnerResetPinSchema } from '@/lib/api-schemas';
import { hashPartnerAdminPin } from '@/lib/partner-pin-crypto';
import {
  isPartnerPinOtpExpired,
  verifyPartnerPinOtp,
} from '@/lib/partner-pin-reset';
import {
  checkRateLimit,
  getRequestRateLimitKey,
  resetRateLimit,
} from '@/lib/rate-limit';
import { revokeAllStatefulSessions } from '@/lib/session-revocation';

const MAX_RESET_ATTEMPTS = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = await parseJsonBody(request, partnerResetPinSchema);
    if (!parsed.ok) return parsed.response;

    const { email, otp, new_pin: newPin } = parsed.data;
    const rateKey = `${getRequestRateLimitKey(request, 'partner-reset-pin')}:${slug}:${email}`;
    const limited = checkRateLimit(rateKey, MAX_RESET_ATTEMPTS, RESET_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many attempts. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSeconds) },
        }
      );
    }

    const partner = await getPartnerForPinReset(slug, email);
    if (!partner) {
      return Response.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    const stored = await getPartnerPinResetOtp(slug);
    if (
      !stored?.otp_hash ||
      isPartnerPinOtpExpired(stored.otp_expires_at) ||
      !(await verifyPartnerPinOtp(stored.otp_hash, otp))
    ) {
      return Response.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    const hashedPin = await hashPartnerAdminPin(newPin);
    await updatePartnerAdminPin(slug, hashedPin);
    await clearPartnerPinResetOtp(slug);
    await revokeAllStatefulSessions();
    resetRateLimit(rateKey);

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to reset PIN' }, { status: 500 });
  }
}
