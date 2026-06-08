import sql from '@/app/api/utils/sql';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    // Exclude admin_pin from public response
    const result = await sql`
      SELECT id, slug, firm_name, owner_name, owner_email, logo_url, brand_color,
             secondary_color, tagline, description, status, monthly_fee_paid,
             setup_fee_waived, total_traders, total_revenue, payment_proof_url,
             created_at, updated_at, template, fee_markup
      FROM partners WHERE slug = ${slug} LIMIT 1
    `;
    if (result.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }
    return Response.json(result[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partner' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const allowed = [
      'status',
      'firm_name',
      'tagline',
      'description',
      'brand_color',
      'secondary_color',
      'monthly_fee_paid',
      'logo_url',
      'template',
      'admin_pin',
      'fee_markup',
    ];
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
    values.push(slug);

    const query = `UPDATE partners SET ${setClauses.join(', ')} WHERE slug = $${i} RETURNING *`;
    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await sql`DELETE FROM partners WHERE slug = ${slug}`;
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
}
