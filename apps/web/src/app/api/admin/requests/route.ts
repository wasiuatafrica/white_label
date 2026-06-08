import sql from '@/app/api/utils/sql';

// GET /api/admin/requests — all trader requests across every partner
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        r.id,
        r.request_type,
        r.status,
        r.notes,
        r.admin_notes,
        r.created_at,
        r.updated_at,
        r.eval_id,
        e.eval_type,
        e.amount,
        e.status       AS eval_status,
        e.payout_status,
        t.id           AS trader_id,
        t.name         AS trader_name,
        t.email        AS trader_email,
        t.kyc_status,
        p.id           AS partner_id,
        p.slug         AS partner_slug,
        p.firm_name    AS partner_firm_name,
        p.brand_color  AS partner_brand_color
      FROM trader_requests r
      JOIN evaluations e ON e.id = r.eval_id
      JOIN traders t ON t.id = r.trader_id
      JOIN partners p ON p.id = r.partner_id
      ORDER BY
        CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
        r.created_at DESC
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// PATCH /api/admin/requests — approve or reject a request
// Body: { request_id, status: 'approved' | 'rejected', admin_notes? }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { request_id, status, admin_notes } = body;

    if (!request_id || !['approved', 'rejected'].includes(status)) {
      return Response.json(
        { error: 'request_id and status (approved|rejected) are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE trader_requests
      SET status = ${status},
          admin_notes = ${admin_notes || null},
          updated_at = NOW()
      WHERE id = ${request_id}
      RETURNING id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
