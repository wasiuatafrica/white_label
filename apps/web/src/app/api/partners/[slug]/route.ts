import {
  deletePartnerBySlug,
  getPartnerBySlug,
  getPartnerPrivateBySlug,
  updatePartnerBySlug,
} from '@/db/queries/partners';
import {
  generatePartnerAdminPin,
  isValidPartnerAdminPin,
  partnerPinNeedsGeneration,
} from '@/lib/admin-pin';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
} from '@/lib/partner-admin-auth-guard';
import {
  sendPartnerFirmLiveEmail,
  sendPartnerLicensePaymentConfirmedEmail,
  sendPartnerSuspensionEmail,
  sendPartnerWelcomeEmail,
} from '@/lib/email/ft9ja-to-partner';
import { hashPartnerAdminPin, verifyPartnerAdminPin } from '@/lib/partner-pin-crypto';
import { isAllowedPartnerLogoUrl } from '@/lib/partner-logo-validation';
import { partnerLogoImageSrc } from '@/lib/partner-logo';
import { revokeAllStatefulSessions } from '@/lib/session-revocation';

const SUPER_ADMIN_FIELDS = ['status', 'monthly_fee_paid'] as const;
const PARTNER_ADMIN_FIELDS = [
  'firm_name',
  'tagline',
  'description',
  'brand_color',
  'secondary_color',
  'logo_url',
  'template',
  'admin_pin',
  'fee_markup',
] as const;

function withPartnerLogoDisplayUrl<
  T extends {
    slug: string;
    logo_url: string | null;
    last_generated_logo_url?: string | null;
  },
>(partner: T) {
  return {
    ...partner,
    logo_display_url: partnerLogoImageSrc(partner.slug, partner.logo_url),
    last_generated_logo_display_url: partnerLogoImageSrc(
      partner.slug,
      partner.last_generated_logo_url ?? null
    ),
  };
}

function stripAdminPin<T extends { admin_pin?: string }>(partner: T) {
  const { admin_pin: _adminPin, ...partnerResponse } = partner;
  return partnerResponse;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const partner = await getPartnerBySlug(slug);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }
    return Response.json(withPartnerLogoDisplayUrl(partner));
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch partner' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const needsSuperAdmin = SUPER_ADMIN_FIELDS.some((key) => key in body);
    const needsPartnerAdmin = PARTNER_ADMIN_FIELDS.some((key) => key in body);

    let adminAuth: Awaited<ReturnType<typeof requireAdmin>> | null = null;
    if (needsSuperAdmin) {
      adminAuth = await requireAdmin(request);
      if (isAdminUnauthorized(adminAuth)) return adminAuth;
    }

    const hasSuperAdminAuth = Boolean(adminAuth && !isAdminUnauthorized(adminAuth));

    if (needsPartnerAdmin && !hasSuperAdminAuth) {
      const partnerAuth = await requirePartnerAdmin(request, slug);
      if (isPartnerAdminUnauthorized(partnerAuth)) return partnerAuth;
    }

    const allowed = [...SUPER_ADMIN_FIELDS, ...PARTNER_ADMIN_FIELDS];
    const hasAllowedField = allowed.some((key) => key in body);
    if (!hasAllowedField) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const shouldCompareLifecycle =
      'status' in body ||
      'monthly_fee_paid' in body ||
      'admin_pin' in body ||
      body.status === 'active';
    const existing = shouldCompareLifecycle ? await getPartnerPrivateBySlug(slug) : null;

    let generatedAdminPinPlain: string | null = null;

    if ('admin_pin' in body) {
      if (!existing) {
        return Response.json({ error: 'Partner not found' }, { status: 404 });
      }

      const newPin = String(body.admin_pin || '');
      if (!isValidPartnerAdminPin(newPin)) {
        return Response.json({ error: 'Admin PIN must be 6 to 12 digits' }, { status: 400 });
      }

      const isSuperAdmin = Boolean(adminAuth && !isAdminUnauthorized(adminAuth));
      if (!isSuperAdmin && !partnerPinNeedsGeneration(existing.admin_pin)) {
        const currentPin =
          typeof body.current_admin_pin === 'string' ? body.current_admin_pin : undefined;
        if (
          !currentPin ||
          !(await verifyPartnerAdminPin(existing.admin_pin, currentPin))
        ) {
          return Response.json({ error: 'Current admin PIN is required' }, { status: 403 });
        }
      }

      body.admin_pin = await hashPartnerAdminPin(newPin);
      await revokeAllStatefulSessions();
    }

    if ('logo_url' in body && body.logo_url != null && body.logo_url !== '') {
      const logoUrl = String(body.logo_url);
      if (!isAllowedPartnerLogoUrl(slug, logoUrl)) {
        return Response.json({ error: 'Logo URL must be an allowed S3 or proxy URL' }, { status: 400 });
      }
    }

    if (body.status === 'active') {
      if (!existing) {
        return Response.json({ error: 'Partner not found' }, { status: 404 });
      }
      if (!existing.payment_proof_url) {
        return Response.json(
          { error: 'Payment receipt is required before approval' },
          { status: 400 }
        );
      }

      body.monthly_fee_paid = true;
      if (partnerPinNeedsGeneration(existing.admin_pin)) {
        generatedAdminPinPlain = generatePartnerAdminPin();
        body.admin_pin = await hashPartnerAdminPin(generatedAdminPinPlain);
      }
    }

    const partner = await updatePartnerBySlug(slug, body);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (existing) {
      await sendPartnerLifecycleEmails(existing, partner, generatedAdminPinPlain);
    }

    if (needsSuperAdmin && adminAuth && !isAdminUnauthorized(adminAuth)) {
      await logAdminAction({
        adminUserId: adminAuth.admin.id,
        action: 'partner.update',
        resourceType: 'partner',
        resourceId: slug,
        metadata: {
          status: body.status ?? undefined,
          monthly_fee_paid: body.monthly_fee_paid ?? undefined,
        },
        request,
      });
    }

    return Response.json(withPartnerLogoDisplayUrl(stripAdminPin(partner)));
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

async function sendPartnerLifecycleEmails(
  previous: NonNullable<Awaited<ReturnType<typeof getPartnerPrivateBySlug>>>,
  current: NonNullable<Awaited<ReturnType<typeof getPartnerPrivateBySlug>>>,
  generatedAdminPinPlain: string | null
) {
  const emails: Array<Promise<unknown>> = [];

  if (previous.status === 'pending' && current.status === 'active') {
    emails.push(sendPartnerWelcomeEmail(current, generatedAdminPinPlain ?? undefined));
    emails.push(sendPartnerFirmLiveEmail(current));
  } else if (previous.status === 'suspended' && current.status === 'active') {
    emails.push(sendPartnerFirmLiveEmail(current));
  }

  if (previous.status === 'active' && current.status === 'suspended') {
    emails.push(sendPartnerSuspensionEmail(current));
  }

  if (!previous.monthly_fee_paid && current.monthly_fee_paid) {
    emails.push(sendPartnerLicensePaymentConfirmedEmail(current));
  }

  const results = await Promise.allSettled(emails);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to send FT9ja partner lifecycle email:', result.reason);
    }
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const { slug } = await params;
    await deletePartnerBySlug(slug);

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: 'partner.delete',
      resourceType: 'partner',
      resourceId: slug,
      request,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
}
