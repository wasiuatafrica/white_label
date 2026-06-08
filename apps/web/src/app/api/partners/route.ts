import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    const partners = await sql`
      SELECT * FROM partners ORDER BY created_at DESC
    `;
    return Response.json(partners);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firm_name,
      slug,
      owner_name,
      owner_email,
      tagline,
      description,
      brand_color,
      secondary_color,
      payment_method,
      payment_proof_url,
    } = body;

    if (!firm_name || !slug || !owner_email) {
      return Response.json(
        { error: 'firm_name, slug, and owner_email are required' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await sql`SELECT id FROM partners WHERE slug = ${slug}`;
    if (existing.length > 0) {
      return Response.json(
        { error: 'That subdomain is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO partners (
        slug, firm_name, owner_name, owner_email, tagline, description,
        brand_color, secondary_color, payment_proof_url, status
      ) VALUES (
        ${slug}, ${firm_name}, ${owner_name || null}, ${owner_email},
        ${tagline || null}, ${description || null},
        ${brand_color || '#16A34A'}, ${secondary_color || '#F59E0B'},
        ${payment_proof_url || null}, 'pending'
      )
      RETURNING *
    `;

    return Response.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
