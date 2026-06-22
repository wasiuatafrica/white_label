import { listAllTradeAccounts } from '@/db/queries/admin';

export async function GET() {
  try {
    const rows = await listAllTradeAccounts();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch trade accounts' }, { status: 500 });
  }
}
