import sql from '@/app/api/utils/sql';
import { parseSessionFromRequest } from '@/app/api/utils/session';

// GET — get KYC status (requires session)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await sql`
      SELECT kyc_status, kyc_full_name, kyc_id_type, kyc_id_number,
             kyc_id_url, kyc_address, kyc_selfie_url, kyc_submitted_at
      FROM traders WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(rows[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch KYC' }, { status: 500 });
  }
}

// POST — submit KYC (requires session)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, id_type, id_number, id_url, address, selfie_url } = body;

    if (!full_name || !id_type || !id_number || !id_url || !address) {
      return Response.json(
        { error: 'Full name, ID type, ID number, ID document URL, and address are required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE traders SET
        kyc_status = 'submitted',
        kyc_full_name = ${full_name},
        kyc_id_type = ${id_type},
        kyc_id_number = ${id_number},
        kyc_id_url = ${id_url},
        kyc_address = ${address},
        kyc_selfie_url = ${selfie_url || null},
        kyc_submitted_at = NOW()
      WHERE id = ${id}
    `;

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}

// PATCH — admin approve/reject KYC (no session required, uses admin PIN)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await request.json();
    const { kyc_status, admin_pin } = body;

    if (!['approved', 'rejected'].includes(kyc_status)) {
      return Response.json({ error: 'kyc_status must be approved or rejected' }, { status: 400 });
    }

    // Verify admin PIN
    const partners = await sql`SELECT id, admin_pin FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partners.length === 0)
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    if (partners[0].admin_pin !== admin_pin) {
      return Response.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    await sql`UPDATE traders SET kyc_status = ${kyc_status} WHERE id = ${id} AND partner_id = ${partners[0].id}`;
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
