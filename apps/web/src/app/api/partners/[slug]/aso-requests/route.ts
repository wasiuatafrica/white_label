import { parseSessionFromRequest } from '@/app/api/utils/session';
import {
  createAsoRequest,
  getAsoEligibilityForAccount,
  listAsoRequestsByTrader,
} from '@/db/queries/aso-requests';
import { getPartnerIdBySlug } from '@/db/queries/partners';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== session.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const requests = await listAsoRequestsByTrader(session.traderId, session.partnerId);
    return Response.json({ requests });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch ASO requests' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== session.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const body = await request.json();
    const ssAccountId = Number(body.ss_account_id);
    if (!ssAccountId) {
      return Response.json({ error: 'ss_account_id is required' }, { status: 400 });
    }

    const result = await createAsoRequest({
      traderId: session.traderId,
      partnerId: session.partnerId,
      ssAccountId,
    });

    if (!result.request) {
      return Response.json(
        { error: result.eligibility.reason || 'Account is not eligible for ASO' },
        { status: 400 }
      );
    }

    return Response.json({ request: result.request }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to submit ASO request' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const partnerId = await getPartnerIdBySlug(slug);
    if (!partnerId || partnerId !== session.partnerId) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const body = await request.json();
    const ssAccountId = Number(body.ss_account_id);
    if (!ssAccountId) {
      return Response.json({ error: 'ss_account_id is required' }, { status: 400 });
    }

    const eligibility = await getAsoEligibilityForAccount(
      ssAccountId,
      session.traderId,
      session.partnerId
    );
    return Response.json({ eligibility });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to check ASO eligibility' }, { status: 500 });
  }
}
