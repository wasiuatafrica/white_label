import { parseSessionFromRequest } from '@/app/api/utils/session';
import { getPartnerIdBySlug } from '@/db/queries/partners';
import { getActiveEvaluationForTradeAccount } from '@/db/queries/evaluations';
import { completeTradeAccount, listTradeAccountsByTrader } from '@/db/queries/trade-accounts';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== session.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const accounts = await listTradeAccountsByTrader(session.traderId, session.partnerId);
    return Response.json({ accounts });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch trade accounts' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== session.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const body = await request.json();
    const evaluationId = Number(body.evaluation_id);
    const accountNumber = Number(body.number);
    const activationCode = String(body.activation_code || '').trim().toUpperCase();
    const password = String(body.password || '').trim();
    const investorPassword = String(body.investor_password || '').trim();

    if (!evaluationId || !accountNumber || !activationCode || !password || !investorPassword) {
      return Response.json(
        {
          error:
            'evaluation_id, activation_code, number, password, and investor_password are required',
        },
        { status: 400 }
      );
    }

    if (!/^[A-F0-9]{8}$/.test(activationCode)) {
      return Response.json({ error: 'Invalid activation code format' }, { status: 400 });
    }

    const evaluation = await getActiveEvaluationForTradeAccount(
      evaluationId,
      session.traderId,
      session.partnerId
    );
    if (!evaluation) {
      return Response.json(
        { error: 'Evaluation is not active for this trader' },
        { status: 403 }
      );
    }

    const account = await completeTradeAccount({
      traderId: session.traderId,
      partnerId: session.partnerId,
      evaluationId,
      creationCode: activationCode,
      number: accountNumber,
      password,
      investorPassword,
    });

    if (!account) {
      return Response.json(
        { error: 'Invalid or already used activation code' },
        { status: 403 }
      );
    }

    return Response.json({ account });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to save trade account' }, { status: 500 });
  }
}
