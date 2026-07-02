import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createTraderWithCount,
  listTradersByPartnerId,
  traderEmailExists,
} from '@/db/queries/traders';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';
import argon2 from 'argon2';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const traders = await listTradersByPartnerId(auth.partnerId);
    return Response.json(traders);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch traders' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email) {
      return Response.json({ error: 'name and email are required' }, { status: 400 });
    }

    if (await traderEmailExists(auth.partnerId, email)) {
      return Response.json({ error: 'A trader with this email already exists.' }, { status: 409 });
    }

    const passwordHash = password ? await argon2.hash(password) : null;
    const trader = await createTraderWithCount({
      partnerId: auth.partnerId,
      name,
      email,
      passwordHash,
    });

    return Response.json(trader, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to add trader' }, { status: 500 });
  }
}
