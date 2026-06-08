import sql from '@/app/api/utils/sql';
import argon2 from 'argon2';
import { parseSessionFromRequest } from '@/app/api/utils/session';

// GET — get trader profile (session required)
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
      SELECT id, name, email, status, kyc_status, created_at
      FROM traders WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(rows[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch trader' }, { status: 500 });
  }
}

// PATCH — update name / change password (session required)
export async function PATCH(
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
    const { name, current_password, new_password } = body;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (name?.trim()) {
      setClauses.push(`name = $${i++}`);
      values.push(name.trim());
    }

    if (new_password) {
      if (new_password.length < 8) {
        return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      const rows = await sql`SELECT password_hash FROM traders WHERE id = ${id}`;
      if (rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

      if (rows[0].password_hash) {
        if (!current_password) {
          return Response.json({ error: 'Current password is required' }, { status: 400 });
        }
        const valid = await argon2.verify(rows[0].password_hash, current_password);
        if (!valid) {
          return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
      }

      const hash = await argon2.hash(new_password);
      setClauses.push(`password_hash = $${i++}`);
      values.push(hash);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE traders SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING id, name, email, status`;
    const result = await sql(query, values);

    return Response.json(result[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
