import { randomUUID } from 'crypto';
import { authorizeUpload } from '@/lib/upload-auth';
import { buildS3ObjectUrl, putObjectToS3 } from '@/lib/storage/s3';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';
import { validateUploadFile } from '@/lib/upload-validation';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function readUploadIntent(request: Request, formData?: FormData) {
  const headerIntent = request.headers.get('x-upload-intent');
  if (headerIntent) return headerIntent;
  return formData?.get('upload_intent')?.toString() ?? null;
}

function readPartnerSlug(request: Request, formData?: FormData) {
  const headerSlug = request.headers.get('x-partner-slug');
  if (headerSlug) return headerSlug;
  return formData?.get('slug')?.toString() ?? null;
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

    const slug = readPartnerSlug(request, formData);
    const normalizedSlug = slug ? normalizePartnerSlug(slug) : null;
    if (slug && (!normalizedSlug || !isValidPartnerSlug(normalizedSlug))) {
      return Response.json({ error: 'Valid partner slug is required' }, { status: 400 });
    }
    const uploadIntent = readUploadIntent(request, formData);
    const auth = await authorizeUpload(request, { slug: normalizedSlug, uploadIntent });
    if (!auth.authorized) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'File too large' }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadFile(bytes, file.type || 'application/octet-stream');
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const safeName = sanitizeFileName(file.name || 'receipt');
    const datePrefix = new Date().toISOString().slice(0, 10);
    const receiptPrefix = normalizedSlug
      ? `uploads/receipts/${normalizedSlug}/${datePrefix}`
      : `uploads/receipts/${datePrefix}`;
    const key = `${receiptPrefix}/${randomUUID()}-${safeName}`;

    await putObjectToS3({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      key,
      contentType: validation.contentType,
      body: bytes,
    });

    return Response.json({
      url: buildS3ObjectUrl(bucket, region, key),
      mimeType: validation.contentType,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
