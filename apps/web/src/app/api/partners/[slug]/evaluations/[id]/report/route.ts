import { authorizeEvaluationView } from '@/lib/evaluation-view-access';
import { getTradeReport } from '@/lib/trading-report';

/** Full trade history analysis (raw MT5 orders grouped by position). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await authorizeEvaluationView(request, slug, id);
    if (access instanceof Response) return access;

    const report = access.accountNumber ? await getTradeReport(access.accountNumber) : null;
    return Response.json({ account_number: access.accountNumber, report });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load trade report' }, { status: 500 });
  }
}
