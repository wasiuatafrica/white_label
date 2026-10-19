import { authorizeEvaluationView } from '@/lib/evaluation-view-access';
import { getDailyFeed, isDailyFeedRange } from '@/lib/trading-performance';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await authorizeEvaluationView(request, slug, id);
    if (access instanceof Response) return access;

    const days = Number(new URL(request.url).searchParams.get('days') ?? 1);
    if (!isDailyFeedRange(days)) {
      return Response.json({ error: 'days must be 1, 3, 7 or 30' }, { status: 400 });
    }

    const feed = access.accountNumber ? await getDailyFeed(access.accountNumber, days) : null;
    return Response.json(feed ?? { days: [] });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load daily feed' }, { status: 500 });
  }
}
