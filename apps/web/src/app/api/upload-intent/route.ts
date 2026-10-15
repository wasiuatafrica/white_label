import { getPartnerIdBySlug } from '@/db/queries/partners';
import { getPartnerSignupEventByAttemptId } from '@/db/queries/partner-signup-events';
import { checkRateLimit, getRequestRateLimitKey } from '@/lib/rate-limit';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';
import {
  createUploadIntentToken,
  type UploadIntentPurpose,
} from '@/lib/upload-intent-token';
import { isUploadIntentPurpose } from '@/lib/upload-auth';

const MAX_INTENT_REQUESTS = 20;
const INTENT_WINDOW_MS = 15 * 60 * 1000;
const INTENT_TTL_SECONDS = 5 * 60;

export async function POST(request: Request) {
  try {
    const rateKey = getRequestRateLimitKey(request, 'upload-intent');
    const limited = await checkRateLimit(rateKey, MAX_INTENT_REQUESTS, INTENT_WINDOW_MS, {
      failClosed: true,
    });
    if (!limited.allowed) {
      return Response.json(
        { error: 'Too many upload authorization requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const purpose = String(body.purpose || '') as UploadIntentPurpose;

    if (!isUploadIntentPurpose(purpose)) {
      return Response.json({ error: 'Invalid upload purpose' }, { status: 400 });
    }

    if (purpose === 'partner_apply') {
      const attemptId = String(body.attempt_id || '').trim();
      const slug = normalizePartnerSlug(String(body.slug || ''));
      if (!attemptId || attemptId.length > 64) {
        return Response.json({ error: 'attempt_id is required' }, { status: 400 });
      }
      if (body.slug && (!slug || !isValidPartnerSlug(slug))) {
        return Response.json({ error: 'Valid slug is required' }, { status: 400 });
      }
      const event = await getPartnerSignupEventByAttemptId(attemptId);
      if (!event || event.status === 'submitted') {
        return Response.json({ error: 'Open application not found' }, { status: 403 });
      }

      const token = await createUploadIntentToken({
        purpose,
        attemptId,
        ...(slug ? { slug } : {}),
      });
      if (!token) {
        return Response.json({ error: 'Upload authorization is unavailable' }, { status: 503 });
      }
      return Response.json({ upload_intent: token, expires_in_seconds: INTENT_TTL_SECONDS });
    }

    const slug = normalizePartnerSlug(String(body.slug || ''));
    if (!slug || !isValidPartnerSlug(slug)) {
      return Response.json({ error: 'Valid slug is required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const token = await createUploadIntentToken({ purpose, slug });
    if (!token) {
      return Response.json({ error: 'Upload authorization is unavailable' }, { status: 503 });
    }
    return Response.json({ upload_intent: token, expires_in_seconds: INTENT_TTL_SECONDS });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create upload authorization' }, { status: 500 });
  }
}
