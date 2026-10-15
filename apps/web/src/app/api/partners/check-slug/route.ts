import { slugExists } from '@/db/queries/partners';
import { checkRateLimit, getRequestRateLimitKey } from '@/lib/rate-limit';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export const runtime = 'nodejs';

const MAX_CHECKS = 30;
const WINDOW_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const limited = await checkRateLimit(
      getRequestRateLimitKey(request, 'check-slug'),
      MAX_CHECKS,
      WINDOW_MS,
      { failClosed: true }
    );
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const slug = normalizePartnerSlug(new URL(request.url).searchParams.get('slug') || '');
    if (!slug || !isValidPartnerSlug(slug)) {
      return Response.json({ available: false });
    }

    const taken = await slugExists(slug);
    return Response.json({ available: !taken });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to check subdomain' }, { status: 500 });
  }
}
