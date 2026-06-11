import { createS3PresignedGetUrl, parseS3ObjectUrl } from '@/lib/storage/s3';
import { requestHasAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminPassword) {
      return Response.json({ error: 'Admin auth is not configured' }, { status: 500 });
    }

    if (!requestHasAdminSession(request, adminPassword)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return Response.json({ error: 'AWS receipt viewing is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const receiptUrl = searchParams.get('url');

    if (!receiptUrl) {
      return Response.json({ error: 'url is required' }, { status: 400 });
    }

    const key = parseS3ObjectUrl(receiptUrl, bucket, region);
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
