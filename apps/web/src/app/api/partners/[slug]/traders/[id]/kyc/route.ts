import { getPartnerWithPinBySlug } from '@/db/queries/partners';
import {
  getTraderKyc,
  submitTraderKyc,
  updateTraderKycStatus,
} from '@/db/queries/traders';
import { parseSessionFromRequest } from '@/app/api/utils/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kyc = await getTraderKyc(Number(id));
    if (!kyc) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(kyc);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch KYC' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, id_type, id_number, id_url, address, selfie_url } = body;

    if (!full_name || !id_type || !id_number || !id_url || !address) {
      return Response.json(
        { error: 'Full name, ID type, ID number, ID document URL, and address are required' },
        { status: 400 }
      );
    }

    await submitTraderKyc(Number(id), {
      fullName: full_name,
      idType: id_type,
      idNumber: id_number,
      idUrl: id_url,
      address,
      selfieUrl: selfie_url,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await request.json();
    const { kyc_status, admin_pin } = body;

    if (!['approved', 'rejected'].includes(kyc_status)) {
      return Response.json({ error: 'kyc_status must be approved or rejected' }, { status: 400 });
    }

    const partner = await getPartnerWithPinBySlug(slug);
    if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });
    if (partner.admin_pin !== admin_pin) {
      return Response.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    await updateTraderKycStatus(Number(id), kyc_status, partner.id);
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
