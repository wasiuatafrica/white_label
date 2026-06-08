import { getPartnerIdBySlug } from '@/db/queries/partners';
import { getEvaluationForTrader } from '@/db/queries/evaluations';
import {
  createTraderRequest,
  findDuplicateTraderRequest,
  listTraderRequests,
} from '@/db/queries/trader-requests';
import { parseSessionFromRequest } from '@/app/api/utils/session';

const VALID_TYPES = ['talent_bonus', 'aso_payout_ssl', 'aso_account'] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await listTraderRequests(Number(id));
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eval_id, request_type, notes } = body;

    if (!eval_id || !request_type) {
      return Response.json({ error: 'eval_id and request_type are required' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(request_type)) {
      return Response.json({ error: 'Invalid request_type' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const ev = await getEvaluationForTrader(eval_id, Number(id), partnerId);
    if (!ev) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    if (request_type === 'aso_payout_ssl' && ev.eval_type !== 'SSL') {
      return Response.json(
        { error: 'Aso Payout (SSL) is only available for SSL evaluations' },
        { status: 400 }
      );
    }
    if (request_type === 'aso_account' && ev.eval_type === 'SSL') {
      return Response.json(
        { error: 'Aso Account is not available for SSL evaluations' },
        { status: 400 }
      );
    }

    const existing = await findDuplicateTraderRequest(eval_id, request_type);
    if (existing) {
      return Response.json(
        { error: 'A request of this type already exists for this evaluation' },
        { status: 409 }
      );
    }

    const result = await createTraderRequest({
      traderId: Number(id),
      partnerId,
      evalId: eval_id,
      requestType: request_type,
      notes,
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
