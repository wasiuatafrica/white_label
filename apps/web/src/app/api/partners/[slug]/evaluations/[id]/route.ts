import { getPartnerIdBySlug } from '@/db/queries/partners';
import { updateEvaluation } from '@/db/queries/evaluations';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();

    const allowed = ['status', 'current_profit', 'current_drawdown', 'trading_days'];
    const hasAllowedField = allowed.some((key) => key in body);
    if (!hasAllowedField) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (body.status === 'active' || body.status === 'pending_payment') {
      return Response.json(
        { error: 'Payment verification is handled by FT9ja super admin' },
        { status: 403 }
      );
    }

    const evaluation = await updateEvaluation(Number(id), auth.partnerId, body);
    if (!evaluation) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    return Response.json(evaluation);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
