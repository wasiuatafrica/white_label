import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createEvaluationForTrader,
  createEvaluationWithTrader,
  listEvaluationsByPartnerId,
  listEvaluationsByTrader,
} from '@/db/queries/evaluations';
import { getTraderByEmail, getTraderForSession } from '@/db/queries/traders';
import { parseSessionFromRequest } from '@/app/api/utils/session';

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

    const session = parseSessionFromRequest(request, slug);
    const canViewAccountActivation =
      session?.partnerId === partnerId && session.traderId === trader.id;
    const evaluations = await listEvaluationsByTrader(partnerId, trader.id);
    if (!canViewAccountActivation) {
      const publicEvaluations = evaluations.map(
        ({
          account_creation_code: _accountCreationCode,
          trade_account_id: _tradeAccountId,
          trade_account_number: _tradeAccountNumber,
          trade_account_platform: _tradeAccountPlatform,
          trade_account_broker: _tradeAccountBroker,
          trade_account_completed: _tradeAccountCompleted,
          ...evaluation
        }) => evaluation
      );
      return Response.json({ trader, evaluations: publicEvaluations });
    }

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
    const { name, email, eval_type, amount, payment_method, payment_proof_url } = body;

    if (eval_type !== 'SS' && eval_type !== 'SSL') {
      return Response.json({ error: 'eval_type must be SS or SSL' }, { status: 400 });
    }

    if (!payment_method || !payment_proof_url) {
      return Response.json(
        { error: 'payment_method and payment_proof_url are required' },
        { status: 400 }
      );
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const session = parseSessionFromRequest(request, slug);
    if (session?.partnerId === partnerId) {
      const trader = await getTraderForSession(session.traderId, partnerId);
      if (!trader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const evaluation = await createEvaluationForTrader({
        partnerId,
        traderId: trader.id,
        evalType: eval_type,
        amount: amount || 0,
        paymentMethod: payment_method,
        paymentProofUrl: payment_proof_url,
      });

      return Response.json({ trader, evaluation }, { status: 201 });
    }

    if (!name || !email) {
      return Response.json({ error: 'name and email are required' }, { status: 400 });
    }

    const result = await createEvaluationWithTrader({
      partnerId,
      name,
      email,
      evalType: eval_type,
      amount: amount || 0,
      paymentMethod: payment_method,
      paymentProofUrl: payment_proof_url,
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
