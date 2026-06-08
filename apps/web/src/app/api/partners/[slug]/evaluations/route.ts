import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createEvaluationWithTrader,
  listEvaluationsByPartnerId,
  listEvaluationsByTrader,
} from '@/db/queries/evaluations';
import { getTraderByEmail } from '@/db/queries/traders';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (!email) {
      const evaluations = await listEvaluationsByPartnerId(partnerId);
      return Response.json({ evaluations });
    }

    const trader = await getTraderByEmail(partnerId, email);
    if (!trader) {
      return Response.json({ error: 'Trader not found' }, { status: 404 });
    }

    const evaluations = await listEvaluationsByTrader(partnerId, trader.id);
    return Response.json({ trader, evaluations });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, email, eval_type, amount } = body;

    if (!name || !email || !eval_type) {
      return Response.json({ error: 'name, email and eval_type are required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const result = await createEvaluationWithTrader({
      partnerId,
      name,
      email,
      evalType: eval_type,
      amount: amount || 0,
    });

    return Response.json(
      { trader: result.trader, evaluation: result.evaluation },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create evaluation' }, { status: 500 });
  }
}
