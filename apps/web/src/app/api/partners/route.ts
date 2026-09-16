import { createPartner, listPartners, slugExists } from '@/db/queries/partners';
import { getBatchPartnerLicenseCoverage } from '@/db/queries/partner-license-invoices';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { exemptLicenseCoverage } from '@/lib/partner-license-billing';
import { isLicenseRecurringExempt } from '@/lib/partner-pricing';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const partners = await listPartners();
    const partnerIds = partners.map((p) => p.id);
    const coverageMap = await getBatchPartnerLicenseCoverage(partnerIds);

    const enriched = partners.map((p) => ({
      ...p,
      monthly_fee_paid: isLicenseRecurringExempt(p.slug) ? true : p.monthly_fee_paid,
      license_coverage: coverageMap.get(p.id) ?? {
        ...(isLicenseRecurringExempt(p.slug)
          ? exemptLicenseCoverage()
          : {
              isCovered: false,
              status: 'none' as const,
              periodStart: null,
              periodEnd: null,
              nextDueAt: null,
            }),
        latestInvoice: null,
      },
    }));

    return Response.json(enriched);
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
      return Response.json({ error: 'That subdomain is unavailable.' }, { status: 400 });
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

    const { admin_pin: _adminPin, ...partnerResponse } = partner;
    return Response.json(partnerResponse, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
