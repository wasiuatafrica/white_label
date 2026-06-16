import { listAllTradersByPartner } from '@/db/queries/admin';

export async function GET() {
  try {
    const rows = await listAllTradersByPartner();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch traders' }, { status: 500 });
  }
}
