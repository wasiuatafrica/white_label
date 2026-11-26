import { createHash, createHmac } from 'crypto';

/**
 * Object storage for the web app (manual SigV4, no `@aws-sdk`).
 *
 * Two backends, picked by env:
 * - `R2_ENDPOINT` unset: AWS S3, virtual-hosted URLs on `{bucket}.s3.{AWS_REGION}.amazonaws.com`,
 *   signed with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. This is the original behaviour.
 * - `R2_ENDPOINT` set: Cloudflare R2's S3 API, path-style URLs on `{R2_ENDPOINT}/{bucket}/{key}`,
 *   region `auto`, signed with `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
 *
 * The bucket name comes from `AWS_S3_BUCKET` in both modes (the R2 bucket has the same name).
 * The bucket is private in both modes: stored URLs are identifiers, and reads go through
 * presigned GETs or proxy routes. The signer never sends `x-amz-checksum-*` headers or ACLs,
 * so R2's "checksums only when required" behaviour needs no extra handling.
 */

export type StorageProvider = 's3' | 'r2';

/** Where objects live. Enough to build and parse stored object URLs. */
export type StorageLocation = {
  provider: StorageProvider;
  bucket: string;
  /** SigV4 signing region: `AWS_REGION` on S3, `auto` on R2. */
  region: string;
  /** R2 endpoint origin (no trailing slash). `null` on S3. */
  endpoint: string | null;
};

/** A location plus the credentials needed to sign requests against it. */
export type StorageConfig = StorageLocation & {
  accessKeyId: string;
  secretAccessKey: string;
};

function normalizeEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** True when the R2 switch is on (`R2_ENDPOINT` is set and non-empty). */
export function isR2Enabled() {
  return Boolean(process.env.R2_ENDPOINT?.trim());
}

/**
 * Bucket location without credentials. Used by URL validation, which today only needs the
 * bucket and region. Returns `null` when storage is not configured.
 */
export function getStorageLocation(): StorageLocation | null {
  const bucket = process.env.AWS_S3_BUCKET;

  const r2Endpoint = process.env.R2_ENDPOINT?.trim();
  if (r2Endpoint) {
    const endpoint = normalizeEndpoint(r2Endpoint);
    if (!endpoint || !bucket) return null;
    return { provider: 'r2', bucket, region: 'auto', endpoint };
  }

  const region = process.env.AWS_REGION;
  if (!region || !bucket) return null;
  return { provider: 's3', bucket, region, endpoint: null };
}

/** Bucket location plus signing credentials. Returns `null` when storage is not configured. */
export function getStorageConfig(): StorageConfig | null {
  const location = getStorageLocation();
  if (!location) return null;

  const accessKeyId =
    location.provider === 'r2' ? process.env.R2_ACCESS_KEY_ID : process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    location.provider === 'r2'
      ? process.env.R2_SECRET_ACCESS_KEY
      : process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) return null;
  return { ...location, accessKeyId, secretAccessKey };
}

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

function decodeS3Path(path: string) {
  return path
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');
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

function s3Host(bucket: string, region: string) {
  return `${bucket}.s3.${region}.amazonaws.com`;
}

/** Host, canonical URI and request origin for one object. */
function objectTarget(location: StorageLocation, key: string) {
  if (location.provider === 'r2' && location.endpoint) {
    const endpoint = new URL(location.endpoint);
    return {
      host: endpoint.host,
      origin: endpoint.origin,
      canonicalUri: `/${location.bucket}/${encodeS3Key(key)}`,
    };
  }

  const host = s3Host(location.bucket, location.region);
  return { host, origin: `https://${host}`, canonicalUri: `/${encodeS3Key(key)}` };
}

/**
 * The canonical URL stored in the database for an object. The bucket is private, so this is
 * an identifier, not a link a browser can open; read it via a presigned GET or a proxy route.
 */
export function buildS3ObjectUrl(location: StorageLocation, key: string) {
  const { origin, canonicalUri } = objectTarget(location, key);
  return `${origin}${canonicalUri}`;
}

// Legacy S3 URLs for the same bucket, in any region (bucket names are global on S3).
function legacyS3HostPattern(bucket: string) {
  const escaped = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}\\.s3(?:[.-][a-z0-9-]+)?\\.amazonaws\\.com$`);
}

/**
 * Turns a stored object URL back into its key, or `null` if it does not point at this bucket.
 *
 * On S3 only `https://{bucket}.s3.{region}.amazonaws.com/{key}` is accepted (unchanged).
 * On R2 both `{R2_ENDPOINT}/{bucket}/{key}` and legacy S3 URLs for the same bucket are accepted,
 * because rows written before the switch still hold S3 URLs and the keys were copied as-is.
 */
export function parseS3ObjectUrl(url: string, location: StorageLocation) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (location.provider === 'r2' && location.endpoint) {
    const endpoint = new URL(location.endpoint);
    if (parsed.protocol === endpoint.protocol && parsed.host === endpoint.host) {
      const bucketPrefix = `/${location.bucket}/`;
      if (!parsed.pathname.startsWith(bucketPrefix)) return null;
      const key = decodeS3Path(parsed.pathname.slice(bucketPrefix.length));
      return key || null;
    }

    if (parsed.protocol !== 'https:' || !legacyS3HostPattern(location.bucket).test(parsed.hostname)) {
      return null;
    }
    const key = decodeS3Path(parsed.pathname.replace(/^\/+/, ''));
    return key || null;
  }

  const expectedHost = s3Host(location.bucket, location.region);

  if (parsed.protocol !== 'https:' || parsed.hostname !== expectedHost) {
    return null;
  }

  const key = decodeS3Path(parsed.pathname.replace(/^\/+/, ''));

  return key || null;
}

export function hasAllowedS3KeyPrefix(key: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some((prefix) => key.startsWith(prefix));
}

export async function putObjectToS3(params: {
  config: StorageConfig;
  key: string;
  contentType: string;
  body: Buffer;
}) {
  const { config } = params;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const { host, origin, canonicalUri } = objectTarget(config, params.key);
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
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region);
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const body = new Uint8Array(params.body.length);
  body.set(params.body);

  const res = await fetch(`${origin}${canonicalUri}`, {
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
  config: StorageConfig;
  key: string;
  expiresInSeconds?: number;
}) {
  const { config } = params;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const { host, origin, canonicalUri } = objectTarget(config, params.key);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const signedHeaders = 'host';
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
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
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region);
  const signature = hmacHex(signingKey, stringToSign);

  return `${origin}${canonicalUri}?${canonicalQuery({
    ...queryParams,
    'X-Amz-Signature': signature,
  })}`;
}
