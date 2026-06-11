import { randomUUID } from 'crypto';
import { buildS3ObjectUrl, putObjectToS3 } from '@/lib/storage/s3';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: Request) {
  try {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return Response.json({ error: 'AWS upload is not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'File too large' }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFileName(file.name || 'receipt');
    const key = `uploads/receipts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const contentType = file.type || 'application/octet-stream';

    await putObjectToS3({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      key,
      contentType,
      body: bytes,
    });

    return Response.json({
      url: buildS3ObjectUrl(bucket, region, key),
      mimeType: contentType,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
