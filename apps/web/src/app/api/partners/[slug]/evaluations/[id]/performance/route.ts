import { authorizeEvaluationView } from '@/lib/evaluation-view-access';
import { getTradingPerformance } from '@/lib/trading-performance';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await authorizeEvaluationView(request, slug, id);
    if (access instanceof Response) return access;

    const performance = access.accountNumber
      ? await getTradingPerformance(access.accountNumber)
      : null;
    return Response.json({ performance });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load trading performance' }, { status: 500 });
  }
}
