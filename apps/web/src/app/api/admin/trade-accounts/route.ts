import { listAllTradeAccounts } from '@/db/queries/admin';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listAllTradeAccounts();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch trade accounts' }, { status: 500 });
  }
}
