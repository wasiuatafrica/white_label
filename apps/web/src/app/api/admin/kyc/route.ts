import { listKycSubmissions } from '@/db/queries/admin';
import { updateTraderKycStatus } from '@/db/queries/traders';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listKycSubmissions();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { trader_id, kyc_status } = body;

    if (!trader_id || !['approved', 'rejected'].includes(kyc_status)) {
      return Response.json(
        { error: 'trader_id and kyc_status (approved|rejected) are required' },
        { status: 400 }
      );
    }

    await updateTraderKycStatus(trader_id, kyc_status);

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: `kyc.${kyc_status}`,
      resourceType: 'trader',
      resourceId: trader_id,
      request,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
