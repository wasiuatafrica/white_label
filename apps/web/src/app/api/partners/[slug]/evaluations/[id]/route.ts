import sql from '@/app/api/utils/sql';

// PATCH /api/partners/[slug]/evaluations/[id]
// Body: { status, current_profit, current_drawdown, trading_days }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await request.json();

    const partner = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partner.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const allowed = ['status', 'current_profit', 'current_drawdown', 'trading_days'];
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const key of allowed) {
      if (key in body) {
        setClauses.push(`${key} = $${i}`);
        values.push(body[key]);
        i++;
      }
    }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    values.push(partner[0].id);

    const query = `
      UPDATE evaluations
      SET ${setClauses.join(', ')}
      WHERE id = $${i} AND partner_id = $${i + 1}
      RETURNING *
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
