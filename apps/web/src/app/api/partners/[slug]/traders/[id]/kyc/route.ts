import { updateTraderKycStatus, getTraderKyc, submitTraderKyc } from '@/db/queries/traders';
import { parseSessionFromRequest } from '@/app/api/utils/session';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';
import { hasAllowedS3KeyPrefix, parseS3ObjectUrl } from '@/lib/storage/s3';

function validateKycDocumentUrl(url: unknown, slug: string) {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket) {
    return { ok: false as const, status: 500, error: 'KYC document storage is not configured' };
  }

  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) {
    return { ok: false as const, status: 400, error: 'KYC document URL is required' };
  }

  const key = parseS3ObjectUrl(value, bucket, region);
  if (!key || !hasAllowedS3KeyPrefix(key, [`uploads/receipts/${slug}/`])) {
    return { ok: false as const, status: 400, error: 'KYC document URL is not valid' };
  }

  return { ok: true as const, url: value };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = await parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kyc = await getTraderKyc(Number(id), session.partnerId);
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
    const session = await parseSessionFromRequest(request, slug);
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

    const idUrlValidation = validateKycDocumentUrl(id_url, slug);
    if (!idUrlValidation.ok) {
      return Response.json(
        { error: idUrlValidation.error },
        { status: idUrlValidation.status }
      );
    }

    const selfieUrlValidation = selfie_url
      ? validateKycDocumentUrl(selfie_url, slug)
      : { ok: true as const, url: null };
    if (!selfieUrlValidation.ok) {
      return Response.json(
        { error: selfieUrlValidation.error },
        { status: selfieUrlValidation.status }
      );
    }

    await submitTraderKyc(Number(id), session.partnerId, {
      fullName: full_name,
      idType: id_type,
      idNumber: id_number,
      idUrl: idUrlValidation.url,
      address,
      selfieUrl: selfieUrlValidation.url,
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
  const { slug, id } = await params;
  const auth = await requirePartnerAdminWrite(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { kyc_status } = body;

    if (!['approved', 'rejected'].includes(kyc_status)) {
      return Response.json({ error: 'kyc_status must be approved or rejected' }, { status: 400 });
    }

    await updateTraderKycStatus(Number(id), kyc_status, auth.partnerId);
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
