import sql from '@/app/api/utils/sql';
import argon2 from 'argon2';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const traders = await sql`
      SELECT t.* FROM traders t
      WHERE t.partner_id = ${partner[0].id}
      ORDER BY t.created_at DESC
    `;

    return Response.json(traders);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch traders' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, email, partner_id, password } = body;

    if (!name || !email) {
      return Response.json({ error: 'name and email are required' }, { status: 400 });
    }

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const pid = partner_id || partner[0].id;

    const existing =
      await sql`SELECT id FROM traders WHERE email = ${email} AND partner_id = ${pid}`;
    if (existing.length > 0) {
      return Response.json({ error: 'A trader with this email already exists.' }, { status: 409 });
    }

    // Hash password if provided
    const passwordHash = password ? await argon2.hash(password) : null;

    const result = await sql`
      INSERT INTO traders (partner_id, name, email, status, password_hash)
      VALUES (${pid}, ${name}, ${email}, 'active', ${passwordHash})
      RETURNING *
    `;

    await sql`
      UPDATE partners SET total_traders = total_traders + 1, updated_at = NOW()
      WHERE id = ${pid}
    `;

    return Response.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to add trader' }, { status: 500 });
  }
}
