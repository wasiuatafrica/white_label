import { parseSessionFromRequest } from '@/app/api/utils/session';
import { parseAdminSessionFromRequest } from '@/lib/admin-session';
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { parsePartnerAdminSessionFromRequest } from '@/lib/partner-admin-session';
import {
  verifyUploadIntentToken,
  type UploadIntentPurpose,
} from '@/lib/upload-intent-token';

export type UploadAuthResult =
  | { authorized: true }
  | { authorized: false; status: number; error: string };

export async function authorizeUpload(
  request: Request,
  options: { slug?: string | null; uploadIntent?: string | null }
): Promise<UploadAuthResult> {
  const slug = options.slug?.trim() || null;
  const uploadIntent = options.uploadIntent?.trim() || null;

  if (await parseAdminSessionFromRequest(request)) {
    return { authorized: true };
  }

  if (slug) {
    const partnerAdmin = await parsePartnerAdminSessionFromRequest(request, slug);
    if (partnerAdmin) {
      const partnerId = await getPartnerIdBySlug(slug);
      if (partnerId && partnerAdmin.partnerId === partnerId) {
        return { authorized: true };
      }
    }

    const traderSession = await parseSessionFromRequest(request, slug);
    if (traderSession) {
      return { authorized: true };
    }
  }

  if (uploadIntent) {
    const intent = verifyUploadIntentToken(uploadIntent);
    if (!intent) {
      return { authorized: false, status: 403, error: 'Invalid or expired upload authorization' };
    }

    if (intent.purpose === 'guest_checkout') {
      if (!slug || !intent.slug || intent.slug !== slug) {
        return { authorized: false, status: 403, error: 'Upload authorization does not match partner' };
      }
      const partnerId = await getPartnerIdBySlug(slug);
      if (!partnerId) {
        return { authorized: false, status: 404, error: 'Partner not found' };
      }
      return { authorized: true };
    }

    if (intent.purpose === 'partner_apply') {
      if (!intent.attemptId) {
        return { authorized: false, status: 403, error: 'Invalid upload authorization' };
      }
      return { authorized: true };
    }
  }

  return { authorized: false, status: 401, error: 'Upload authorization required' };
}

export function isUploadIntentPurpose(value: string): value is UploadIntentPurpose {
  return value === 'partner_apply' || value === 'guest_checkout';
}
