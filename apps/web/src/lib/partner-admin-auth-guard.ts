import { parsePartnerAdminSessionFromRequest } from '@/lib/partner-admin-session';

export type PartnerAdminContext = {
  partnerId: number;
  slug: string;
};

export function isPartnerAdminUnauthorized(
  result: PartnerAdminContext | Response
): result is Response {
  return result instanceof Response;
}

export async function requirePartnerAdmin(
  request: Request,
  slug: string
): Promise<PartnerAdminContext | Response> {
  const session = await parsePartnerAdminSessionFromRequest(request, slug);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Session HMAC already binds partnerId + slug; avoid a redundant slug lookup.
  if (!session.partnerId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { partnerId: session.partnerId, slug };
}
