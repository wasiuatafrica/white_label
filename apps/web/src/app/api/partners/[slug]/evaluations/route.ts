import { getPartnerIdBySlug, getPartnerPrivateBySlug } from '@/db/queries/partners';
import {
  createEvaluationForTrader,
  createEvaluationWithTrader,
  listEvaluationsByPartnerId,
  listEvaluationsByTrader,
} from '@/db/queries/evaluations';
import { getTraderPublicByEmail, getTraderForSession } from '@/db/queries/traders';
import { parseSessionFromRequest } from '@/app/api/utils/session';
import { verifyAdminTraderViewToken } from '@/lib/admin-trader-view-token';
import { emailSchema } from '@/lib/api-schemas';
import { isUniqueViolation } from '@/lib/db-errors';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';
import { amountsMatch, getTraderPrice, type EvalType } from '@/lib/partner-pricing';
import { TraderEmailConflictError } from '@/lib/trader-email';

function toPublicTrader(trader: {
  id: number;
  partner_id: number;
  name: string;
  email: string;
  password_hash?: string | null;
  reset_token?: string | null;
  reset_token_expires?: Date | string | null;
  status: string;
  kyc_status: string;
  kyc_full_name?: string | null;
  kyc_id_type?: string | null;
  kyc_id_number?: string | null;
  kyc_id_url?: string | null;
  kyc_address?: string | null;
  kyc_selfie_url?: string | null;
  kyc_submitted_at?: Date | string | null;
  created_at: Date | string;
}) {
  const {
    password_hash: _passwordHash,
    reset_token: _resetToken,
    reset_token_expires: _resetTokenExpires,
    ...rest
  } = trader;
  return rest;
}

function stripSensitiveEvaluationFields<
  T extends { account_creation_code?: unknown; trade_account_id?: unknown },
>(evaluation: T) {
  const {
    account_creation_code: _accountCreationCode,
    trade_account_id: _tradeAccountId,
    ...rest
  } = evaluation;
  return rest;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const viewToken = url.searchParams.get('view_token');

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (!email) {
      const auth = await requirePartnerAdmin(request, slug);
      if (isPartnerAdminUnauthorized(auth)) return auth;

      const evaluations = await listEvaluationsByPartnerId(partnerId);
      return Response.json({ evaluations });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trader = await getTraderPublicByEmail(partnerId, normalizedEmail);
    if (!trader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await parseSessionFromRequest(request, slug);
    const isTraderOwner =
      session?.partnerId === partnerId && session.traderId === trader.id;

    const partnerAdminAuth = await requirePartnerAdmin(request, slug);
    const isPartnerAdmin = !isPartnerAdminUnauthorized(partnerAdminAuth);

    const hasAdminViewToken =
      Boolean(viewToken) &&
      verifyAdminTraderViewToken(String(viewToken), slug, normalizedEmail);

    if (!isTraderOwner && !isPartnerAdmin && !hasAdminViewToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evaluations = await listEvaluationsByTrader(partnerId, trader.id);
    if (!isTraderOwner) {
      return Response.json({
        trader,
        evaluations: evaluations.map(stripSensitiveEvaluationFields),
      });
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

    const partner = await getPartnerPrivateBySlug(slug);
    const expectedAmount = getTraderPrice(eval_type as EvalType, partner?.fee_markup ?? 0);
    if (!amountsMatch(amount, expectedAmount)) {
      return Response.json(
        { error: 'amount does not match current partner pricing' },
        { status: 400 }
      );
    }

    const session = await parseSessionFromRequest(request, slug);
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

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      return Response.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const result = await createEvaluationWithTrader({
      partnerId,
      name,
      email: parsedEmail.data,
      evalType: eval_type,
      amount: amount || 0,
      paymentMethod: payment_method,
      paymentProofUrl: payment_proof_url,
    });

    return Response.json(
      { trader: toPublicTrader(result.trader), evaluation: result.evaluation },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    if (e instanceof TraderEmailConflictError) {
      return Response.json({ error: e.message }, { status: 409 });
    }
    if (isUniqueViolation(e)) {
      return Response.json(
        { error: 'This email is already registered with another firm.' },
        { status: 409 }
      );
    }
    return Response.json({ error: 'Failed to create evaluation' }, { status: 500 });
  }
}
