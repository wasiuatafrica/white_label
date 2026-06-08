import { getPartnerIdBySlug } from '@/db/queries/partners';
import {
  createTraderWithCount,
  listTradersByPartnerId,
  traderEmailExists,
} from '@/db/queries/traders';
import argon2 from 'argon2';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const traders = await listTradersByPartnerId(partnerId);
    return Response.json(traders);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch traders' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, email, partner_id, password } = body;

    if (!name || !email) {
      return Response.json({ error: 'name and email are required' }, { status: 400 });
    }

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const pid = partner_id || partnerId;

    if (await traderEmailExists(pid, email)) {
      return Response.json({ error: 'A trader with this email already exists.' }, { status: 409 });
    }

    const passwordHash = password ? await argon2.hash(password) : null;
    const trader = await createTraderWithCount({
      partnerId: pid,
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
