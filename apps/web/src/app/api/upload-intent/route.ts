import { getPartnerIdBySlug } from '@/db/queries/partners';
import { checkRateLimit, getRequestRateLimitKey } from '@/lib/rate-limit';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';
import {
  createUploadIntentToken,
  type UploadIntentPurpose,
} from '@/lib/upload-intent-token';
import { isUploadIntentPurpose } from '@/lib/upload-auth';

const MAX_INTENT_REQUESTS = 20;
const INTENT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const rateKey = getRequestRateLimitKey(request, 'upload-intent');
    const limited = checkRateLimit(rateKey, MAX_INTENT_REQUESTS, INTENT_WINDOW_MS);
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
      if (!attemptId || attemptId.length > 64) {
        return Response.json({ error: 'attempt_id is required' }, { status: 400 });
      }

      const token = createUploadIntentToken({ purpose, attemptId });
      return Response.json({ upload_intent: token, expires_in_seconds: 30 * 60 });
    }

    const slug = normalizePartnerSlug(String(body.slug || ''));
    if (!slug || !isValidPartnerSlug(slug)) {
      return Response.json({ error: 'Valid slug is required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const token = createUploadIntentToken({ purpose, slug });
    return Response.json({ upload_intent: token, expires_in_seconds: 30 * 60 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create upload authorization' }, { status: 500 });
  }
}
