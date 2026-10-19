import { parseSessionFromRequest } from '@/app/api/utils/session';
import { getEvaluationTradeAccountForView } from '@/db/queries/evaluations';
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { readAdminTraderViewCookie } from '@/lib/admin-trader-view-cookie';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';

/**
 * Read access to one evaluation's trading data: the owning trader, the partner admin
 * (incl. Super Admin read-only partner view), the Super Admin trader-view cookie, or a
 * Super Admin session.
 */
export async function authorizeEvaluationView(
  request: Request,
  slug: string,
  rawEvaluationId: string
): Promise<{ accountNumber: number | null } | Response> {
  const evaluationId = Number(rawEvaluationId);
  if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
    return Response.json({ error: 'Invalid evaluation id' }, { status: 400 });
  }

  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

  const evaluation = await getEvaluationTradeAccountForView(partnerId, evaluationId);
  if (!evaluation) return Response.json({ error: 'Not found' }, { status: 404 });

  const session = await parseSessionFromRequest(request, slug);
  const allowed =
    (session?.partnerId === partnerId && session.traderId === evaluation.trader_id) ||
    Boolean(readAdminTraderViewCookie(request, slug, evaluation.trader_email)) ||
    !isPartnerAdminUnauthorized(await requirePartnerAdmin(request, slug)) ||
    !isAdminUnauthorized(await requireAdmin(request));

  if (!allowed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const accountNumber = Number(evaluation.trade_account_number);
  return { accountNumber: accountNumber > 0 ? accountNumber : null };
}
