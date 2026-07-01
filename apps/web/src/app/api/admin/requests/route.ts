import { listAllTraderRequests } from '@/db/queries/admin';
import { updateTraderRequest } from '@/db/queries/trader-requests';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listAllTraderRequests();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { request_id, status, admin_notes } = body;

    if (!request_id || !['approved', 'rejected'].includes(status)) {
      return Response.json(
        { error: 'request_id and status (approved|rejected) are required' },
        { status: 400 }
      );
    }

    const result = await updateTraderRequest(request_id, status, admin_notes);
    if (!result) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: `trader_request.${status}`,
      resourceType: 'trader_request',
      resourceId: request_id,
      metadata: admin_notes ? { admin_notes } : null,
      request,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
