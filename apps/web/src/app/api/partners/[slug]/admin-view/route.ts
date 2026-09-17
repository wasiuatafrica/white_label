import { getPartnerIdBySlug } from '@/db/queries/partners';
import { verifyAdminPartnerAdminViewToken } from '@/lib/admin-partner-admin-view-token';
import { getPartnerAdminViewRedirectUrl } from '@/lib/tenant';
import {
  PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get('token') || '';

  if (!verifyAdminPartnerAdminViewToken(token, slug)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId) {
    return Response.json({ error: 'Partner not found' }, { status: 404 });
  }

  const sessionToken = createPartnerAdminSessionToken({
    partnerId,
    slug,
    mode: 'readonly',
  });
  const redirectUrl = getPartnerAdminViewRedirectUrl(request, slug);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': createPartnerAdminSessionCookie(slug, sessionToken, {
        secure: process.env.NODE_ENV === 'production',
        maxAge: PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
      }),
    },
  });
}
