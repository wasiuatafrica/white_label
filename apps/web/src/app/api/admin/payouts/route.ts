import sql from '@/app/api/utils/sql';

// GET /api/admin/payouts — all passed evaluations across every partner
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        e.id              AS eval_id,
        e.eval_type,
        e.amount,
        e.status,
        e.payout_status,
        e.current_profit,
        e.trading_days,
        e.required_days,
        e.updated_at      AS passed_at,
        t.id              AS trader_id,
        t.name            AS trader_name,
        t.email           AS trader_email,
        t.kyc_status,
        p.id              AS partner_id,
        p.slug            AS partner_slug,
        p.firm_name       AS partner_firm_name,
        p.brand_color     AS partner_brand_color
      FROM evaluations e
      JOIN traders t ON t.id = e.trader_id
      JOIN partners p ON p.id = e.partner_id
      WHERE e.status = 'passed'
      ORDER BY
        CASE e.payout_status
          WHEN NULL THEN 0
          WHEN 'processing' THEN 1
          WHEN 'paid' THEN 2
          ELSE 0
        END,
        e.updated_at DESC
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

// PATCH /api/admin/payouts — update payout_status for a passed evaluation
// Body: { eval_id, payout_status: 'processing' | 'paid' }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { eval_id, payout_status } = body;

    if (!eval_id || !['processing', 'paid'].includes(payout_status)) {
      return Response.json(
        { error: 'eval_id and payout_status (processing|paid) are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE evaluations
      SET payout_status = ${payout_status}, updated_at = NOW()
      WHERE id = ${eval_id} AND status = 'passed'
      RETURNING id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update payout status' }, { status: 500 });
  }
}
