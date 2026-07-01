import { listAdminAuditLogs } from '@/db/queries/admin-audit-logs';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500);
    const rows = await listAdminAuditLogs(limit);
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
