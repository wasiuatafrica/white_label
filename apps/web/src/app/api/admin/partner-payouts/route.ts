import { listPartners } from '@/db/queries/partners';
import {
  getPartnerAvailableBalance,
  listAllPartnerPayoutRequests,
  updatePartnerPayoutRequest,
} from '@/db/queries/partner-payout-requests';

export async function GET() {
  try {
    const [requests, partners] = await Promise.all([
      listAllPartnerPayoutRequests(),
      listPartners(),
    ]);

    const partnerById = new Map(partners.map((p) => [p.id, p]));
    const balances = await Promise.all(
      partners.map(async (partner) => ({
        partner_id: partner.id,
        available_balance: await getPartnerAvailableBalance(partner.id),
      }))
    );
    const balanceByPartner = new Map(balances.map((b) => [b.partner_id, b.available_balance]));

    const rows = requests.map((request) => {
      const partner = partnerById.get(request.partner_id);
      return {
        ...request,
        partner_slug: partner?.slug ?? null,
        partner_firm_name: partner?.firm_name ?? null,
        partner_brand_color: partner?.brand_color ?? null,
        available_balance: balanceByPartner.get(request.partner_id) ?? 0,
      };
    });

    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partner payout requests' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { request_id, status, admin_notes } = body;

    if (!request_id || !['approved', 'rejected', 'paid'].includes(status)) {
      return Response.json(
        { error: 'request_id and status (approved|rejected|paid) are required' },
        { status: 400 }
      );
    }

    const result = await updatePartnerPayoutRequest(
      Number(request_id),
      status,
      typeof admin_notes === 'string' ? admin_notes : undefined
    );
    if (!result) {
      return Response.json({ error: 'Payout request not found' }, { status: 404 });
    }

    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update payout request';
    console.error(e);
    return Response.json({ error: message }, { status: 400 });
  }
}
