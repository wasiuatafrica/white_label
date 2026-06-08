import { listAllTraderRequests } from '@/db/queries/admin';
import { updateTraderRequest } from '@/db/queries/trader-requests';

export async function GET() {
  try {
    const rows = await listAllTraderRequests();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
