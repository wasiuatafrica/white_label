import { getPartnerIdBySlug } from '@/db/queries/partners';
import { createAdminTraderViewCookie } from '@/lib/admin-trader-view-cookie';
import { consumeAdminTraderViewToken } from '@/lib/admin-trader-view-token';
import { getRequestOrigin } from '@/lib/tenant';

async function readFields(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { token?: string; email?: string; eval_id?: string };
    return {
      token: String(body.token || ''),
      email: String(body.email || ''),
      evalId: String(body.eval_id || ''),
    };
  }
  const form = await request.formData();
  return {
    token: String(form.get('token') || ''),
    email: String(form.get('email') || ''),
    evalId: String(form.get('eval_id') || ''),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, email, evalId } = await readFields(request);
  const normalizedEmail = email.trim().toLowerCase();
  const view = await consumeAdminTraderViewToken(token, slug, normalizedEmail);
  if (!view) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId) {
    return Response.json({ error: 'Partner not found' }, { status: 404 });
  }

  const destination = new URL(`/${slug}/dashboard`, `${getRequestOrigin(request)}/`);
  destination.searchParams.set('email', normalizedEmail);
  if (evalId) destination.searchParams.set('eval_id', evalId);

  return new Response(null, {
    status: 303,
    headers: {
      Location: destination.toString(),
      'Set-Cookie': createAdminTraderViewCookie(slug, normalizedEmail, view.adminUserId),
    },
  });
}
