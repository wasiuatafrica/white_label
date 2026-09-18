import {
  createTraderWithCount,
  getTraderEmailOwner,
  listTradersByPartnerId,
} from '@/db/queries/traders';
import { emailSchema } from '@/lib/api-schemas';
import { isUniqueViolation } from '@/lib/db-errors';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';
import { traderEmailConflictMessage } from '@/lib/trader-email';
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
  const auth = await requirePartnerAdminWrite(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  let email = '';
  try {
    const body = await request.json();
    const { name, password } = body;
    const parsedEmail = emailSchema.safeParse(body.email);

    if (!name || !parsedEmail.success) {
      return Response.json({ error: 'name and email are required' }, { status: 400 });
    }

    email = parsedEmail.data;

    const existing = await getTraderEmailOwner(email);
    if (existing) {
      return Response.json(
        { error: traderEmailConflictMessage(existing.partnerId, auth.partnerId) },
        { status: 409 }
      );
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
    if (isUniqueViolation(e)) {
      const existing = email ? await getTraderEmailOwner(email) : null;
      return Response.json(
        {
          error: existing
            ? traderEmailConflictMessage(existing.partnerId, auth.partnerId)
            : 'A trader with this email already exists.',
        },
        { status: 409 }
      );
    }
    return Response.json({ error: 'Failed to add trader' }, { status: 500 });
  }
}
