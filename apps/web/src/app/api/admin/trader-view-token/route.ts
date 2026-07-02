import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { createAdminTraderViewToken } from '@/lib/admin-trader-view-token';
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const slug = normalizePartnerSlug(String(body.slug || ''));
    const email = String(body.email || '').trim().toLowerCase();

    if (!slug || !isValidPartnerSlug(slug) || !email) {
      return Response.json({ error: 'slug and email are required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const view_token = createAdminTraderViewToken({ slug, email });
    return Response.json({ view_token, expires_in_seconds: 60 * 60 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create view token' }, { status: 500 });
  }
}
