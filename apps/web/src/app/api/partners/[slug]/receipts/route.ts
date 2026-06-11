import { getPartnerPrivateBySlug } from '@/db/queries/partners';
import { createS3PresignedGetUrl, parseS3ObjectUrl } from '@/lib/storage/s3';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { url, admin_pin } = await request.json();

    if (!url || !admin_pin) {
      return Response.json({ error: 'url and admin_pin are required' }, { status: 400 });
    }

    const partner = await getPartnerPrivateBySlug(slug);
    if (!partner || partner.admin_pin !== String(admin_pin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return Response.json({ error: 'AWS receipt viewing is not configured' }, { status: 500 });
    }

    const key = parseS3ObjectUrl(String(url), bucket, region);
    if (!key) {
      return Response.json({ error: 'Receipt URL is not valid for this bucket' }, { status: 400 });
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
