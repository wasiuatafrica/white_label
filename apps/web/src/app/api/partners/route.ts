import { createPartner, listPartners, slugExists } from '@/db/queries/partners';

export async function GET() {
  try {
    const partners = await listPartners();
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
      payment_proof_url,
    } = body;

    if (!firm_name || !slug || !owner_email) {
      return Response.json(
        { error: 'firm_name, slug, and owner_email are required' },
        { status: 400 }
      );
    }

    if (await slugExists(slug)) {
      return Response.json(
        { error: 'That subdomain is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const partner = await createPartner({
      slug,
      firmName: firm_name,
      ownerName: owner_name,
      ownerEmail: owner_email,
      tagline,
      description,
      brandColor: brand_color,
      secondaryColor: secondary_color,
      paymentProofUrl: payment_proof_url,
    });

    return Response.json(partner, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
