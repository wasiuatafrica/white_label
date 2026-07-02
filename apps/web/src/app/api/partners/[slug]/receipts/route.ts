import { getPartnerPrivateBySlug } from '@/db/queries/partners';
import { partnerOwnsEvaluationReceipt } from '@/db/queries/evaluations';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';
import {
  createS3PresignedGetUrl,
  hasAllowedS3KeyPrefix,
  parseS3ObjectUrl,
} from '@/lib/storage/s3';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const { url } = await request.json();
    const receiptUrl = String(url || '');

    if (!receiptUrl) {
      return Response.json({ error: 'url is required' }, { status: 400 });
    }

    const partner = await getPartnerPrivateBySlug(slug);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return Response.json({ error: 'AWS receipt viewing is not configured' }, { status: 500 });
    }

    const key = parseS3ObjectUrl(receiptUrl, bucket, region);
    if (!key) {
      return Response.json({ error: 'Receipt URL is not valid for this bucket' }, { status: 400 });
    }
    const isSlugScopedKey = hasAllowedS3KeyPrefix(key, [
      `uploads/receipts/${slug}/`,
      `uploads/logos/${slug}/`,
    ]);
    const isLegacyReceiptKey = hasAllowedS3KeyPrefix(key, ['uploads/receipts/']);
    const ownsLegacyReceipt =
      isLegacyReceiptKey && (await partnerOwnsEvaluationReceipt(partner.id, receiptUrl));

    if (!isSlugScopedKey && !ownsLegacyReceipt) {
      return Response.json({ error: 'Receipt URL is not allowed' }, { status: 403 });
    }

    const signedUrl = createS3PresignedGetUrl({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      key,
      expiresInSeconds: 300,
    });

    return Response.json({ url: signedUrl, expiresInSeconds: 300 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create receipt link' }, { status: 500 });
  }
}
