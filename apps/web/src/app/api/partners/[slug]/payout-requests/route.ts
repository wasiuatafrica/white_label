import sql from '@/app/api/utils/sql';

// GET /api/partners/[slug]/payout-requests
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const rows = await sql`
      SELECT * FROM partner_payout_requests
      WHERE partner_id = ${partner[0].id}
      ORDER BY created_at DESC
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST /api/partners/[slug]/payout-requests
// Body: { amount_requested, bank_name, account_number, account_name, notes? }
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { amount_requested, bank_name, account_number, account_name, notes } = body;

    if (!amount_requested || !bank_name || !account_number || !account_name) {
      return Response.json(
        { error: 'amount_requested, bank_name, account_number, account_name are required' },
        { status: 400 }
      );
    }

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) return Response.json({ error: 'Partner not found' }, { status: 404 });

    // Only one pending request at a time
    const existing = await sql`
      SELECT id FROM partner_payout_requests
      WHERE partner_id = ${partner[0].id} AND status = 'pending'
      LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        { error: 'You already have a pending payout request. Please wait for it to be processed.' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO partner_payout_requests
        (partner_id, amount_requested, bank_name, account_number, account_name, notes)
      VALUES
        (${partner[0].id}, ${amount_requested}, ${bank_name}, ${account_number}, ${account_name}, ${notes || null})
      RETURNING *
    `;
    return Response.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
