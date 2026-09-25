export const DEFAULT_ROOT_DOMAIN = 'ft9ja.com';

export const RESERVED_SUBDOMAINS = new Set([
  'account',
  'accountant',
  'admin',
  'api',
  'apps',
  'app',
  'apply',
  'assets',
  'billing',
  'billings',
  'blog',
  'cdn',
  'customercare',
  'dashboard',
  'dev',
  'discount',
  'docs',
  'ft9ja',
  'guide',
  'help',
  'legal',
  'local',
  'localhost',
  'mail',
  'partner',
  'partners',
  'promo',
  'staging',
  'static',
  'status',
  'support',
  'superadmin',
  'test',
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

const CRITICAL_SUBSTRINGS = ['ft9ja', 'test', 'admin', 'local', 'partner', 'support', 'www'];

function pluralizeReserved(word: string) {
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

const RESERVED_AND_PLURALS = new Set([
  ...RESERVED_SUBDOMAINS,
  ...[...RESERVED_SUBDOMAINS].map(pluralizeReserved),
]);

function matchesReservedWord(value: string, reserved: string) {
  return (
    value === reserved ||
    value.startsWith(reserved) ||
    value.endsWith(reserved) ||
    value.includes(`-${reserved}-`) ||
    value.includes(`-${reserved}`) ||
    value.includes(`${reserved}-`)
  );
}

const RESERVED_ALIASES = new Set([
  // ft9ja brand misspellings / lookalikes
  'ft9a',
  'ftja',
  'ft9ija',
  'ftnaja',
  'ftnaija',
  'fot9ja',
  'ft9jaapp',
  // admin misspellings
  'admn',
  'adnim',
  'adminn',
  'dmin',
  // test misspellings
  'tst',
  'tesst',
  'testt',
  // support misspellings
  'suport',
  'supprot',
  'supportt',
  // partner misspellings
  'patner',
  'parter',
  'partnar',
  // www misspellings
  'ww',
  'wwww',
  'wvw',
  'parnter',
  'partenr',
  'suportdesk',
]);

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    let next: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + cost);
      next.push(val);
      curr = val;
    }
    prev = next;
  }
  return prev[b.length] ?? 99;
}

function isNearReservedToken(token: string) {
  // Fuzzy-match longer critical tokens only; short tokens (test/www)
  // would false-positive on ordinary words like "best" or "powers".
  const fuzzyTargets = ['ft9ja', 'admin', 'local', 'partner', 'support'];
  for (const target of fuzzyTargets) {
    if (Math.abs(token.length - target.length) > 1) continue;
    if (token[0] !== target[0]) continue;
    // Longer names tolerate a transposition (distance 2); short ones stay at 1
    // to avoid flagging ordinary words.
    const maxDistance = target.length >= 6 ? 2 : 1;
    if (levenshtein(token, target) <= maxDistance) return true;
  }
  return false;
}

export function isReservedPartnerSlug(slug: string) {
  const normalized = slug.toLowerCase();
  if (RESERVED_SUBDOMAINS.has(normalized)) return true;
  if (RESERVED_ALIASES.has(normalized)) return true;

  const compact = normalized.replace(/-/g, '');
  if (RESERVED_ALIASES.has(compact)) return true;

  // Singular and plural, including hyphenated compounds (super-admin,
  // customer-care). Prefix, suffix, and hyphen-delimited forms are blocked.
  for (const reserved of RESERVED_AND_PLURALS) {
    if (matchesReservedWord(normalized, reserved)) return true;
    if (compact !== normalized && matchesReservedWord(compact, reserved)) return true;
  }

  // High-risk names get true pre+post wildcards: blocked anywhere,
  // even inside a word (contest, mytest, wwwft9ja, ft9japro).
  for (const critical of CRITICAL_SUBSTRINGS) {
    if (compact.includes(critical)) return true;
  }

  // Misspellings: alias list plus one-typo tolerance per hyphen token.
  const tokens = normalized.split('-').filter(Boolean);
  for (const token of tokens) {
    if (RESERVED_ALIASES.has(token)) return true;
    if (isNearReservedToken(token)) return true;
  }
  if (tokens.length <= 1 && isNearReservedToken(compact)) return true;

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
