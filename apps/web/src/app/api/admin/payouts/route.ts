import { listPassedEvaluationsForPayouts } from '@/db/queries/admin';
import { updateEvaluationPayoutStatus } from '@/db/queries/evaluations';

export async function GET() {
  try {
    const rows = await listPassedEvaluationsForPayouts();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update payout status' }, { status: 500 });
  }
}
