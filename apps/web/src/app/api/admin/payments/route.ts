import sql from '@/app/api/utils/sql';

// GET /api/admin/payments — all pending_payment evaluations across every partner
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        e.id              AS eval_id,
        e.eval_type,
        e.amount,
        e.status,
        e.purchase_date,
        e.profit_target,
        e.max_drawdown,
        e.required_days,
        t.id              AS trader_id,
        t.name            AS trader_name,
        t.email           AS trader_email,
        p.id              AS partner_id,
        p.slug            AS partner_slug,
        p.firm_name       AS partner_firm_name,
        p.brand_color     AS partner_brand_color
      FROM evaluations e
      JOIN traders t ON t.id = e.trader_id
      JOIN partners p ON p.id = e.partner_id
      WHERE e.status = 'pending_payment'
      ORDER BY e.purchase_date DESC
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch pending payments' }, { status: 500 });
  }
}

// PATCH /api/admin/payments — confirm a payment, activate the evaluation
// Body: { eval_id }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { eval_id } = body;

    if (!eval_id) {
      return Response.json({ error: 'eval_id is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE evaluations
      SET status = 'active', updated_at = NOW()
      WHERE id = ${eval_id} AND status = 'pending_payment'
      RETURNING id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Evaluation not found or already activated' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
