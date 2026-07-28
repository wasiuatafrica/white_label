import { listPartners } from '@/db/queries/partners';
import {
  getPartnerAvailableBalances,
  listAllPartnerPayoutRequests,
  updatePartnerPayoutRequest,
} from '@/db/queries/partner-payout-requests';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const [requests, partners] = await Promise.all([
      listAllPartnerPayoutRequests(),
      listPartners(),
    ]);

    const partnerById = new Map(partners.map((p) => [p.id, p]));
    const partnerIds = [...new Set(requests.map((r) => r.partner_id))];
    const balanceByPartner = await getPartnerAvailableBalances(partnerIds);

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
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

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

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: `partner_payout.${status}`,
      resourceType: 'partner_payout_request',
      resourceId: request_id,
      metadata: admin_notes ? { admin_notes } : null,
      request,
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update partner payout request' }, { status: 500 });
  }
}
