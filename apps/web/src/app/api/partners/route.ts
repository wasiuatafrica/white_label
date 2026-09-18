import { createPartner, listPartners, ownerEmailExists, slugExists } from '@/db/queries/partners';
import { getBatchPartnerLicenseCoverage } from '@/db/queries/partner-license-invoices';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { emailSchema } from '@/lib/api-schemas';
import { isUniqueViolation } from '@/lib/db-errors';
import { exemptLicenseCoverage, isLicenseStorefrontFrozen } from '@/lib/partner-license-billing';
import { isLicenseRecurringExempt } from '@/lib/partner-pricing';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const partners = await listPartners();
    const partnerIds = partners.map((p) => p.id);
    const coverageMap = await getBatchPartnerLicenseCoverage(partnerIds);
    const now = new Date();

    const enriched = partners.map((p) => {
      const license_coverage = coverageMap.get(p.id) ?? {
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
      };
      return {
        ...p,
        monthly_fee_paid: isLicenseRecurringExempt(p.slug) ? true : p.monthly_fee_paid,
        license_coverage,
        storefront_frozen: isLicenseStorefrontFrozen(
          license_coverage,
          license_coverage.latestInvoice,
          now
        ),
      };
    });

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
    const parsedEmail = emailSchema.safeParse(owner_email);

    if (!firm_name || !slug || !parsedEmail.success) {
      return Response.json(
        { error: 'firm_name, slug, and owner_email are required' },
        { status: 400 }
      );
    }

    const ownerEmail = parsedEmail.data;

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

    if (await ownerEmailExists(ownerEmail)) {
      return Response.json({ error: 'This email is unavailable.' }, { status: 409 });
    }

    const partner = await createPartner({
      slug,
      firmName: firm_name,
      ownerName: owner_name,
      ownerEmail,
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
    if (isUniqueViolation(e)) {
      const message =
        e instanceof Error && e.message.includes('partners_slug')
          ? 'That subdomain is already taken. Please choose another.'
          : 'This email is unavailable.';
      return Response.json({ error: message }, { status: 409 });
    }
    return Response.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
