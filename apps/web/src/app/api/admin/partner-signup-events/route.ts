import { listPartnerSignupEvents } from '@/db/queries/partner-signup-events';

export async function GET() {
  try {
    const rows = await listPartnerSignupEvents();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partner signup events' }, { status: 500 });
  }
}
