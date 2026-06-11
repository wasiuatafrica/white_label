import { createHash, createHmac } from 'crypto';

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

function encodeS3Key(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodeQueryValue(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function canonicalQuery(params: Record<string, string>) {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
    .join('&');
}

export function buildS3ObjectUrl(bucket: string, region: string, key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeS3Key(key)}`;
}

export function parseS3ObjectUrl(url: string, expectedBucket: string, expectedRegion: string) {
  const parsed = new URL(url);
  const expectedHost = `${expectedBucket}.s3.${expectedRegion}.amazonaws.com`;

  if (parsed.protocol !== 'https:' || parsed.hostname !== expectedHost) {
    return null;
  }

  const key = parsed.pathname
    .replace(/^\/+/, '')
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');

  return key || null;
}

export async function putObjectToS3(params: {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  key: string;
  contentType: string;
  body: Buffer;
}) {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${params.bucket}.s3.${params.region}.amazonaws.com`;
  const canonicalUri = `/${encodeS3Key(params.key)}`;
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

export function createS3PresignedGetUrl(params: {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  key: string;
  expiresInSeconds?: number;
}) {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${params.bucket}.s3.${params.region}.amazonaws.com`;
  const canonicalUri = `/${encodeS3Key(params.key)}`;
  const credentialScope = `${dateStamp}/${params.region}/s3/aws4_request`;
  const signedHeaders = 'host';
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${params.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(params.expiresInSeconds ?? 300),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery(queryParams),
    `host:${host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = getSignatureKey(params.secretAccessKey, dateStamp, params.region);
  const signature = hmacHex(signingKey, stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQuery({
    ...queryParams,
    'X-Amz-Signature': signature,
  })}`;
}
