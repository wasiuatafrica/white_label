import { ownerEmailExists } from '@/db/queries/partners';
import { emailSchema } from '@/lib/api-schemas';
import { checkRateLimit, getRequestRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_CHECKS = 20;
const WINDOW_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const limited = await checkRateLimit(
      getRequestRateLimitKey(request, 'check-email'),
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

    const raw = new URL(request.url).searchParams.get('email') || '';
    const parsed = emailSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ available: false });
    }

    const taken = await ownerEmailExists(parsed.data);
    return Response.json({ available: !taken });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to check email' }, { status: 500 });
  }
}
