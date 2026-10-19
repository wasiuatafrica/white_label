import { authorizeEvaluationView } from '@/lib/evaluation-view-access';
import { getTradeHistory } from '@/lib/trading-performance';

const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await authorizeEvaluationView(request, slug, id);
    if (access instanceof Response) return access;

    const url = new URL(request.url);
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get('page_size'), 20), MAX_PAGE_SIZE);
    const shortParam = url.searchParams.get('short');
    const shortTrade = shortParam === 'true' ? true : shortParam === 'false' ? false : undefined;

    const history = access.accountNumber
      ? await getTradeHistory(access.accountNumber, { page, pageSize, shortTrade })
      : null;
    return Response.json(history ?? { trades: [], total: 0, page, page_size: pageSize });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load trading history' }, { status: 500 });
  }
}
