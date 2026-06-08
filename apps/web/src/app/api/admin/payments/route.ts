import { listPendingPayments } from '@/db/queries/admin';
import { activateEvaluation } from '@/db/queries/evaluations';

export async function GET() {
  try {
    const rows = await listPendingPayments();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch pending payments' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { eval_id } = body;

    if (!eval_id) {
      return Response.json({ error: 'eval_id is required' }, { status: 400 });
    }

    const result = await activateEvaluation(eval_id);
    if (!result) {
      return Response.json({ error: 'Evaluation not found or already activated' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
