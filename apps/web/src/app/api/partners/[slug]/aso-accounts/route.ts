import { parseSessionFromRequest } from '@/app/api/utils/session';
import { createAsoAccountFromApproval } from '@/db/queries/aso-requests';
import { getPartnerIdBySlug } from '@/db/queries/partners';

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
    const accountNumber = Number(body.number);
    const token = String(body.token || '').trim();
    const password = String(body.password || '').trim();
    const investorPassword = String(body.investor_password || '').trim();

    if (!ssAccountId || !accountNumber || !token || !password || !investorPassword) {
      return Response.json(
        { error: 'ss_account_id, token, number, password, and investor_password are required' },
        { status: 400 }
      );
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return Response.json({ error: 'Invalid ASO approval token format' }, { status: 400 });
    }

    const result = await createAsoAccountFromApproval({
      traderId: session.traderId,
      partnerId: session.partnerId,
      ssAccountId,
      token,
      number: accountNumber,
      password,
      investorPassword,
    });

    if (!result.account) {
      return Response.json({ error: result.reason || 'Failed to create ASO account' }, { status: 403 });
    }

    return Response.json({ account: result.account });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to add ASO account' }, { status: 500 });
  }
}
