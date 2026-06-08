import sql from '@/app/api/utils/sql';
import { parseSessionFromRequest } from '@/app/api/utils/session';

const VALID_TYPES = ['talent_bonus', 'aso_payout_ssl', 'aso_account'];

// GET /api/partners/[slug]/traders/[id]/requests — list all requests for this trader
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
      SELECT
        r.id,
        r.eval_id,
        r.request_type,
        r.status,
        r.notes,
        r.admin_notes,
        r.created_at,
        r.updated_at,
        e.eval_type,
        e.amount,
        e.status AS eval_status
      FROM trader_requests r
      JOIN evaluations e ON e.id = r.eval_id
      WHERE r.trader_id = ${id}
      ORDER BY r.created_at DESC
    `;

    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// POST /api/partners/[slug]/traders/[id]/requests — submit a new request
// Body: { eval_id, request_type, notes? }
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
    const { eval_id, request_type, notes } = body;

    if (!eval_id || !request_type) {
      return Response.json({ error: 'eval_id and request_type are required' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(request_type)) {
      return Response.json({ error: 'Invalid request_type' }, { status: 400 });
    }

    // Verify evaluation belongs to this trader and is passed
    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const evalRow = await sql`
      SELECT id, eval_type, status FROM evaluations
      WHERE id = ${eval_id} AND trader_id = ${id} AND partner_id = ${partner[0].id}
      LIMIT 1
    `;

    if (evalRow.length === 0) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    const ev = evalRow[0];

    // Validate request_type against eval_type
    if (request_type === 'aso_payout_ssl' && ev.eval_type !== 'SSL') {
      return Response.json(
        { error: 'Aso Payout (SSL) is only available for SSL evaluations' },
        { status: 400 }
      );
    }
    if (request_type === 'aso_account' && ev.eval_type === 'SSL') {
      return Response.json(
        { error: 'Aso Account is not available for SSL evaluations' },
        { status: 400 }
      );
    }

    // Check for existing pending/approved request of same type for same eval
    const existing = await sql`
      SELECT id FROM trader_requests
      WHERE eval_id = ${eval_id} AND request_type = ${request_type}
        AND status IN ('pending', 'approved')
      LIMIT 1
    `;

    if (existing.length > 0) {
      return Response.json(
        { error: 'A request of this type already exists for this evaluation' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO trader_requests (trader_id, partner_id, eval_id, request_type, notes, status)
      VALUES (${id}, ${partner[0].id}, ${eval_id}, ${request_type}, ${notes || null}, 'pending')
      RETURNING *
    `;

    return Response.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
