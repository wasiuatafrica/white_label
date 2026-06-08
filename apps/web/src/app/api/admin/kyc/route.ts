import sql from '@/app/api/utils/sql';

// GET /api/admin/kyc — all submitted KYC across every partner
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        t.id            AS trader_id,
        t.name          AS trader_name,
        t.email         AS trader_email,
        t.kyc_status,
        t.kyc_full_name,
        t.kyc_id_type,
        t.kyc_id_number,
        t.kyc_id_url,
        t.kyc_address,
        t.kyc_selfie_url,
        t.kyc_submitted_at,
        p.id            AS partner_id,
        p.slug          AS partner_slug,
        p.firm_name     AS partner_firm_name,
        p.brand_color   AS partner_brand_color
      FROM traders t
      JOIN partners p ON p.id = t.partner_id
      WHERE t.kyc_status IN ('submitted', 'approved', 'rejected')
      ORDER BY
        CASE t.kyc_status WHEN 'submitted' THEN 0 ELSE 1 END,
        t.kyc_submitted_at DESC
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}

// PATCH /api/admin/kyc — approve or reject a trader's KYC
// Body: { trader_id, kyc_status: 'approved' | 'rejected' }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { trader_id, kyc_status } = body;

    if (!trader_id || !['approved', 'rejected'].includes(kyc_status)) {
      return Response.json(
        { error: 'trader_id and kyc_status (approved|rejected) are required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE traders
      SET kyc_status = ${kyc_status}
      WHERE id = ${trader_id}
    `;

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
