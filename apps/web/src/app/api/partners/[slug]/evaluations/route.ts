import sql from '@/app/api/utils/sql';

// GET /api/partners/[slug]/evaluations?email=trader@example.com
// Omit ?email to get ALL evaluations for the partner (admin view)
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partnerId = partner[0].id;

    // Admin view: return all evaluations with trader info
    if (!email) {
      const evaluations = await sql`
        SELECT e.*, t.name AS trader_name, t.email AS trader_email
        FROM evaluations e
        JOIN traders t ON t.id = e.trader_id
        WHERE e.partner_id = ${partnerId}
        ORDER BY e.purchase_date DESC
      `;
      return Response.json({ evaluations });
    }

    // Trader view: filter by email
    const trader = await sql`
      SELECT * FROM traders
      WHERE email = ${email} AND partner_id = ${partnerId}
      LIMIT 1
    `;

    if (trader.length === 0) {
      return Response.json({ error: 'Trader not found' }, { status: 404 });
    }

    const evaluations = await sql`
      SELECT * FROM evaluations
      WHERE trader_id = ${trader[0].id} AND partner_id = ${partnerId}
      ORDER BY purchase_date DESC
    `;

    return Response.json({ trader: trader[0], evaluations });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}

// POST /api/partners/[slug]/evaluations
// Body: { name, email, eval_type, amount }
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, email, eval_type, amount } = body;

    if (!name || !email || !eval_type) {
      return Response.json({ error: 'name, email and eval_type are required' }, { status: 400 });
    }

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partnerId = partner[0].id;

    // Find or create trader
    let trader = await sql`
      SELECT * FROM traders WHERE email = ${email} AND partner_id = ${partnerId} LIMIT 1
    `;

    if (trader.length === 0) {
      trader = await sql`
        INSERT INTO traders (partner_id, name, email, status)
        VALUES (${partnerId}, ${name}, ${email}, 'active')
        RETURNING *
      `;
      await sql`
        UPDATE partners SET total_traders = total_traders + 1, updated_at = NOW()
        WHERE id = ${partnerId}
      `;
    }

    const traderId = trader[0].id;

    // Evaluation defaults based on type
    const isSSL = eval_type === 'SSL';
    const profitTarget = isSSL ? 8.0 : 10.0;
    const maxDrawdown = isSSL ? 8.0 : 10.0;
    const requiredDays = isSSL ? 21 : 30;

    const evaluation = await sql`
      INSERT INTO evaluations (
        trader_id, partner_id, eval_type, amount,
        status, profit_target, current_profit,
        max_drawdown, current_drawdown,
        trading_days, required_days,
        purchase_date, updated_at
      )
      VALUES (
        ${traderId}, ${partnerId}, ${eval_type}, ${amount || 0},
        'pending_payment', ${profitTarget}, 0,
        ${maxDrawdown}, 0,
        0, ${requiredDays},
        NOW(), NOW()
      )
      RETURNING *
    `;

    // Update partner revenue
    await sql`
      UPDATE partners SET total_revenue = total_revenue + ${amount || 0}, updated_at = NOW()
      WHERE id = ${partnerId}
    `;

    return Response.json({ trader: trader[0], evaluation: evaluation[0] }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create evaluation' }, { status: 500 });
  }
}
