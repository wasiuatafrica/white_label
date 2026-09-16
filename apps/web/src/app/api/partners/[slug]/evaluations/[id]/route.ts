import {
  isPartnerAdminUnauthorized,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug } = await params;
  const auth = await requirePartnerAdminWrite(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  return Response.json(
    { error: 'Evaluation updates are managed by FT9ja super admin' },
    { status: 403 }
  );
}
