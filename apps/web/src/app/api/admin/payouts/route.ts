import { listPassedEvaluationsForPayouts } from '@/db/queries/admin';
import { updateEvaluationPayoutStatus } from '@/db/queries/evaluations';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listPassedEvaluationsForPayouts();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { eval_id, payout_status } = body;

    if (!eval_id || !['processing', 'paid'].includes(payout_status)) {
      return Response.json(
        { error: 'eval_id and payout_status (processing|paid) are required' },
        { status: 400 }
      );
    }

    const result = await updateEvaluationPayoutStatus(eval_id, payout_status);
    if (!result) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: `payout.${payout_status}`,
      resourceType: 'evaluation',
      resourceId: eval_id,
      request,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update payout status' }, { status: 500 });
  }
}
