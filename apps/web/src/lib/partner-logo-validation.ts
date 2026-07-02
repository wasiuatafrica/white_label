import { getS3EnvConfig, parsePartnerLogoS3Key } from '@/lib/partner-logo';

export function isAllowedPartnerLogoUrl(slug: string, logoUrl: string): boolean {
  const trimmed = logoUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith(`/api/partners/${slug}/logo`)) {
    return true;
  }

  const config = getS3EnvConfig();
  if (!config) return false;

  return parsePartnerLogoS3Key(slug, trimmed, config) !== null;
}
