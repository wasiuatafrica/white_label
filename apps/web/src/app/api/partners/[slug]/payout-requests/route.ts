import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createPartnerPayoutRequest,
  findPendingPartnerPayoutRequest,
  getPartnerAvailableBalance,
  getPartnerReservedPayoutTotal,
  getPartnerTotalEarnings,
  listPartnerPayoutRequests,
} from '@/db/queries/partner-payout-requests';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listPartnerPayoutRequests(auth.partnerId);
    const [available_balance, total_earnings, total_reserved] = await Promise.all([
      getPartnerAvailableBalance(auth.partnerId),
      getPartnerTotalEarnings(auth.partnerId),
      getPartnerReservedPayoutTotal(auth.partnerId),
    ]);
    return Response.json({
      requests: rows,
      available_balance,
      total_earnings,
      total_reserved,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { amount_requested, bank_name, account_number, account_name, notes } = body;

    if (!amount_requested || !bank_name || !account_number || !account_name) {
      return Response.json(
        { error: 'amount_requested, bank_name, account_number, account_name are required' },
        { status: 400 }
      );
    }

    const existing = await findPendingPartnerPayoutRequest(auth.partnerId);
    if (existing) {
      return Response.json(
        { error: 'You already have a pending payout request. Please wait for it to be processed.' },
        { status: 409 }
      );
    }

    const result = await createPartnerPayoutRequest({
      partnerId: auth.partnerId,
      amountRequested: amount_requested,
      bankName: bank_name,
      accountNumber: account_number,
      accountName: account_name,
      notes,
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed';
    console.error(e);
    const status = message.includes('pending payout request') ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
