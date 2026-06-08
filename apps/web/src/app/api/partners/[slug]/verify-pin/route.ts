import sql from '@/app/api/utils/sql';

// POST /api/partners/[slug]/verify-pin
// Body: { pin }
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return Response.json({ error: 'pin is required' }, { status: 400 });
    }

    const result = await sql`SELECT admin_pin FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (result.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const valid = result[0].admin_pin === String(pin);
    return Response.json({ valid });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}
