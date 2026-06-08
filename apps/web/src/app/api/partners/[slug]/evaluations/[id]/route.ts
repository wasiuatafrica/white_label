import { getPartnerIdBySlug } from '@/db/queries/partners';
import { updateEvaluation } from '@/db/queries/evaluations';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await request.json();

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const allowed = ['status', 'current_profit', 'current_drawdown', 'trading_days'];
    const hasAllowedField = allowed.some((key) => key in body);
    if (!hasAllowedField) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const evaluation = await updateEvaluation(Number(id), partnerId, body);
    if (!evaluation) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    return Response.json(evaluation);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
