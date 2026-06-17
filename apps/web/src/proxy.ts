import { NextRequest, NextResponse } from 'next/server';
import {
  getPartnerUrl,
  getRootDomain,
  getTenantSlugFromHost,
  isPlatformPathSegment,
} from './lib/tenant';

function isStaticAsset(pathname: string) {
  return pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/fontawesome');
}

function isPlatformRoute(pathname: string) {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return Boolean(firstSegment && isPlatformPathSegment(firstSegment));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const host = request.headers.get('host');
  const tenantSlug = getTenantSlugFromHost(host);

  if (tenantSlug) {
    const segments = pathname.split('/').filter(Boolean);

    if (segments[0] === tenantSlug) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.pathname = `/${segments.slice(1).join('/')}`;
      if (canonicalUrl.pathname === '/') canonicalUrl.pathname = '/';
      return NextResponse.redirect(canonicalUrl);
    }

    // Platform routes (/guide, /legal, /apply, etc.) are not partner pages.
    if (isPlatformRoute(pathname)) {
      return NextResponse.next();
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${tenantSlug}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const rootDomain = getRootDomain().toLowerCase();
  const normalizedHost = host?.split(':')[0]?.toLowerCase();
  const isRootDomain = normalizedHost === rootDomain || normalizedHost === `www.${rootDomain}`;

  if (isRootDomain) {
    const [firstSegment, ...rest] = pathname.split('/').filter(Boolean);
    if (firstSegment && !isPlatformPathSegment(firstSegment)) {
      const redirectPath = `/${rest.join('/')}`;
      const target = getPartnerUrl(firstSegment, redirectPath === '/' ? '/' : redirectPath);
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
