import { getPartnerIdBySlug } from '@/db/queries/partners';
import { consumeAdminPartnerAdminViewToken } from '@/lib/admin-partner-admin-view-token';
import { getPartnerAdminViewRedirectUrl } from '@/lib/tenant';
import {
  PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
  createPartnerAdminSessionCookie,
  createPartnerAdminSessionToken,
} from '@/lib/partner-admin-session';

async function readToken(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { token?: string };
    return String(body.token || '');
  }
  const form = await request.formData();
  return String(form.get('token') || '');
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = await readToken(request);
  const view = await consumeAdminPartnerAdminViewToken(token, slug);
  if (!view) {
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
    status: 303,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': createPartnerAdminSessionCookie(slug, sessionToken, {
        secure: process.env.NODE_ENV === 'production',
        maxAge: PARTNER_ADMIN_VIEW_SESSION_MAX_AGE,
      }),
    },
  });
}
