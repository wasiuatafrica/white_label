import {
  deletePartnerBySlug,
  getPartnerBySlug,
  updatePartnerBySlug,
} from '@/db/queries/partners';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const partner = await getPartnerBySlug(slug);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }
    return Response.json(partner);
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
    const hasAllowedField = allowed.some((key) => key in body);
    if (!hasAllowedField) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (body.status === 'active') {
      const existing = await getPartnerBySlug(slug);
      if (!existing) {
        return Response.json({ error: 'Partner not found' }, { status: 404 });
      }
      if (!existing.payment_proof_url) {
        return Response.json(
          { error: 'Payment receipt is required before approval' },
          { status: 400 }
        );
      }
    }

    const partner = await updatePartnerBySlug(slug, body);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    return Response.json(partner);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await deletePartnerBySlug(slug);
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
}
