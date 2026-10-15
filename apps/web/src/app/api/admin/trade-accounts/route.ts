import { listAllTradeAccounts, setTradeAccountFlag } from '@/db/queries/admin';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { trade_account_id, field, value } = body ?? {};
    const id = Number(trade_account_id);

    if (!Number.isInteger(id) || id <= 0 || !['blown', 'inactive'].includes(field) || typeof value !== 'boolean') {
      return Response.json(
        { error: 'trade_account_id, field (blown|inactive) and boolean value are required' },
        { status: 400 }
      );
    }

    const updated = await setTradeAccountFlag(id, field, value);
    if (!updated) return Response.json({ error: 'Trade account not found' }, { status: 404 });

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: `trade_account.${field}.${value ? 'set' : 'unset'}`,
      resourceType: 'trade_account',
      resourceId: id,
      request,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update trade account' }, { status: 500 });
  }
}

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
