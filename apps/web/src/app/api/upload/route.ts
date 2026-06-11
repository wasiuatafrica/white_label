import { createHash, createHmac, randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function sha256Hex(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: string | Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildPublicUrl(bucket: string, region: string, key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function putObjectToS3(params: {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  key: string;
  contentType: string;
  body: Buffer;
}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${params.bucket}.s3.${params.region}.amazonaws.com`;
  const encodedKey = params.key.split('/').map(encodeURIComponent).join('/');
  const canonicalUri = `/${encodedKey}`;
  const payloadHash = sha256Hex(params.body);
  const canonicalHeaders = [
    `content-type:${params.contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = getSignatureKey(params.secretAccessKey, dateStamp, params.region);
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const body = new Uint8Array(params.body.length);
  body.set(params.body);

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': params.contentType,
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('S3 upload failed', res.status, detail);
    throw new Error('Failed to upload file');
  }
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
      url: buildPublicUrl(bucket, region, key),
      mimeType: contentType,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
