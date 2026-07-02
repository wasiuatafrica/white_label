import { getPartnerIdBySlug, verifyPartnerPin } from '@/db/queries/partners';
import { isValidPartnerAdminPin } from '@/lib/admin-pin';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';
import {
  clearPartnerAdminSessionCookie,
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';
import {
  checkRateLimit,
  getRequestRateLimitKey,
  resetRateLimit,
} from '@/lib/rate-limit';

const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;

function cookieOptions() {
  return { secure: process.env.NODE_ENV === 'production' };
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(_request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;
  return Response.json({ authenticated: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { pin } = body;

    if (!pin || !isValidPartnerAdminPin(String(pin))) {
      return Response.json({ error: 'pin is required' }, { status: 400 });
    }

    const rateKey = `${getRequestRateLimitKey(request, 'partner-pin')}:${slug}`;
    const limited = checkRateLimit(rateKey, MAX_PIN_ATTEMPTS, PIN_WINDOW_MS);
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many attempts. Try again later.', retryAfterSeconds: limited.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const valid = await verifyPartnerPin(slug, String(pin));
    if (valid === null) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (!valid) {
      return Response.json({ valid: false }, { status: 401 });
    }

    resetRateLimit(rateKey);

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const token = createPartnerAdminSessionToken({ partnerId, slug });
    const res = Response.json({ valid: true, authenticated: true });
    res.headers.set('Set-Cookie', createPartnerAdminSessionCookie(slug, token, cookieOptions()));
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', clearPartnerAdminSessionCookie(slug, cookieOptions()));
  return res;
}
