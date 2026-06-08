import { listKycSubmissions } from '@/db/queries/admin';
import { updateTraderKycStatus } from '@/db/queries/traders';

export async function GET() {
  try {
    const rows = await listKycSubmissions();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
