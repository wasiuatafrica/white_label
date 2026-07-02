import { getPartnerIdBySlug } from '@/db/queries/partners';
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
  const session = parsePartnerAdminSessionFromRequest(request, slug);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId || partnerId !== session.partnerId) {
    return Response.json({ error: 'Partner not found' }, { status: 404 });
  }

  return { partnerId, slug };
}
