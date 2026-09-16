import { getPartnerIdBySlug } from '@/db/queries/partners';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import {
  PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE,
  createAdminPartnerAdminViewToken,
} from '@/lib/admin-partner-admin-view-token';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const slug = normalizePartnerSlug(String(body.slug || ''));

    if (!slug || !isValidPartnerSlug(slug)) {
      return Response.json({ error: 'slug is required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const view_token = createAdminPartnerAdminViewToken({ slug });
    return Response.json({
      view_token,
      expires_in_seconds: PARTNER_ADMIN_VIEW_TOKEN_MAX_AGE,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create view token' }, { status: 500 });
  }
}
