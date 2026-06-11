import { createPartner, listPartners, slugExists } from '@/db/queries/partners';
import { isReservedPartnerSlug, isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

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
      slug: rawSlug,
      owner_name,
      owner_email,
      tagline,
      description,
      brand_color,
      secondary_color,
      payment_proof_url,
    } = body;

    const slug = normalizePartnerSlug(String(rawSlug || ''));

    if (!firm_name || !slug || !owner_email) {
      return Response.json(
        { error: 'firm_name, slug, and owner_email are required' },
        { status: 400 }
      );
    }

    if (!isValidPartnerSlug(slug)) {
      const error = isReservedPartnerSlug(slug)
        ? 'That subdomain is reserved. Please choose another.'
        : 'Subdomain must use only letters, numbers, or hyphens.';
      return Response.json({ error }, { status: 400 });
    }

    if (!payment_proof_url) {
      return Response.json({ error: 'Payment receipt upload is required' }, { status: 400 });
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
