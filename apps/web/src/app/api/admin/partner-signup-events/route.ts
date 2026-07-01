import { listPartnerSignupEvents } from '@/db/queries/partner-signup-events';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listPartnerSignupEvents();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partner signup events' }, { status: 500 });
  }
}
