import { createS3PresignedGetUrl, parseS3ObjectUrl } from '@/lib/storage/s3';

export type S3EnvConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
};

export function getS3EnvConfig(): S3EnvConfig | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  return { accessKeyId, secretAccessKey, region, bucket };
}

export function parsePartnerLogoS3Key(
  slug: string,
  logoUrl: string,
  config: S3EnvConfig
): string | null {
  const key = parseS3ObjectUrl(logoUrl, config.bucket, config.region);
  if (!key || !key.startsWith(`uploads/logos/${slug}/`)) {
    return null;
  }
  return key;
}

export function partnerLogoProxyPath(slug: string, key?: string) {
  if (key) {
    return `/api/partners/${slug}/logo?key=${encodeURIComponent(key)}`;
  }
  return `/api/partners/${slug}/logo`;
}

export function partnerLogoImageSrc(
  slug: string,
  logoUrl: string | null | undefined,
  config: S3EnvConfig | null = getS3EnvConfig()
): string | null {
  if (!logoUrl) return null;
  if (!config) return logoUrl;

  const key = parsePartnerLogoS3Key(slug, logoUrl, config);
  if (key) {
    return partnerLogoProxyPath(slug);
  }

  return logoUrl;
}

export async function fetchPartnerLogoFromS3(key: string, config: S3EnvConfig) {
  const signedUrl = createS3PresignedGetUrl({
    ...config,
    key,
    expiresInSeconds: 60,
  });
  return fetch(signedUrl);
}
