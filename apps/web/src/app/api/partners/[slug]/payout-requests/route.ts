import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createPartnerPayoutRequest,
  findPendingPartnerPayoutRequest,
  listPartnerPayoutRequests,
} from '@/db/queries/partner-payout-requests';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const rows = await listPartnerPayoutRequests(partnerId);
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { amount_requested, bank_name, account_number, account_name, notes } = body;

    if (!amount_requested || !bank_name || !account_number || !account_name) {
      return Response.json(
        { error: 'amount_requested, bank_name, account_number, account_name are required' },
        { status: 400 }
      );
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const existing = await findPendingPartnerPayoutRequest(partnerId);
    if (existing) {
      return Response.json(
        { error: 'You already have a pending payout request. Please wait for it to be processed.' },
        { status: 409 }
      );
    }

    const result = await createPartnerPayoutRequest({
      partnerId,
      amountRequested: amount_requested,
      bankName: bank_name,
      accountNumber: account_number,
      accountName: account_name,
      notes,
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
