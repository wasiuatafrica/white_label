export const DEFAULT_ROOT_DOMAIN = 'ft9ja.com';

export const RESERVED_SUBDOMAINS = new Set([
  'account',
  'admin',
  'api',
  'app',
  'apply',
  'assets',
  'billing',
  'blog',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'guide',
  'help',
  'legal',
  'localhost',
  'mail',
  'partner',
  'partners',
  'staging',
  'static',
  'status',
  'support',
  'www',
]);

const PLATFORM_PATH_SEGMENTS = new Set([
  '_next',
  'account',
  'api',
  'apply',
  'favicon.ico',
  'fontawesome',
  'guide',
  'legal',
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN;
}

export function isLocalHostname(host: string) {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
}

export function normalizePartnerSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

export function isReservedPartnerSlug(slug: string) {
  if (RESERVED_SUBDOMAINS.has(slug)) return true;

  for (const reserved of RESERVED_SUBDOMAINS) {
    if (slug.startsWith(reserved)) return true;
  }

  return false;
}

export function isValidPartnerSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !isReservedPartnerSlug(slug);
}

export function getPartnerBaseUrl(slug: string) {
  const rootDomain = getRootDomain();
  const protocol = isLocalHostname(rootDomain) ? 'http' : 'https';
  return `${protocol}://${normalizePartnerSlug(slug)}.${rootDomain}`;
}

export function getPartnerUrl(slug: string, path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPartnerBaseUrl(slug)}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function getPartnerAdminPanelPath(slug: string) {
  return `/${normalizePartnerSlug(slug)}/admin`;
}

export function getPartnerAdminViewBouncePath(slug: string, token: string) {
  const normalized = normalizePartnerSlug(slug);
  return `/api/partners/${normalized}/admin-view?token=${encodeURIComponent(token)}`;
}

export function resolvePartnerAdminViewBounceUrl(
  slug: string,
  token: string,
  currentOrigin?: string
) {
  const path = getPartnerAdminViewBouncePath(slug, token);
  if (currentOrigin) {
    try {
      const originUrl = new URL(currentOrigin);
      if (isLocalHostname(originUrl.hostname)) {
        return `${originUrl.origin}${path}`;
      }
    } catch {
      // fall through to the partner subdomain URL
    }
  }
  return getPartnerUrl(slug, path);
}

export function getRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    requestUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto
    ? `${forwardedProto}:`
    : isLocalHostname(host)
      ? 'http:'
      : requestUrl.protocol;
  return `${protocol}//${host}`;
}

export function getPartnerAdminViewRedirectUrl(request: Request, slug: string) {
  return new URL(getPartnerAdminPanelPath(slug), `${getRequestOrigin(request)}/`).toString();
}

export function getTenantSlugFromHost(hostHeader: string | null) {
  if (!hostHeader) return null;

  const host = hostHeader.split(':')[0]?.toLowerCase();
  if (!host) return null;

  const rootDomain = getRootDomain().toLowerCase();
  if (
    host === rootDomain ||
    host === `www.${rootDomain}` ||
    host === 'localhost' ||
    host.endsWith('.herokuapp.com')
  ) {
    return null;
  }

  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, -'.localhost'.length);
    return isValidPartnerSlug(slug) ? slug : null;
  }

  if (!host.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const subdomain = host.slice(0, -`.${rootDomain}`.length);
  if (subdomain.includes('.')) return null;

  return isValidPartnerSlug(subdomain) ? subdomain : null;
}

export function isPlatformPathSegment(segment: string) {
  return PLATFORM_PATH_SEGMENTS.has(segment);
}
