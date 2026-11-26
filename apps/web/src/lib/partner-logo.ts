import {
  createS3PresignedGetUrl,
  getStorageConfig,
  parseS3ObjectUrl,
  type StorageConfig,
} from '@/lib/storage/s3';

export type S3EnvConfig = StorageConfig;

/** Storage config (S3, or R2 when `R2_ENDPOINT` is set); see `@/lib/storage/s3`. */
export function getS3EnvConfig(): S3EnvConfig | null {
  return getStorageConfig();
}

export function parsePartnerLogoS3Key(
  slug: string,
  logoUrl: string,
  config: S3EnvConfig
): string | null {
  const key = parseS3ObjectUrl(logoUrl, config);
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
    config,
    key,
    expiresInSeconds: 60,
  });
  return fetch(signedUrl);
}
