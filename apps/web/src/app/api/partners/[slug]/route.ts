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
import {
  sendPartnerFirmLiveEmail,
  sendPartnerLicensePaymentConfirmedEmail,
  sendPartnerSuspensionEmail,
  sendPartnerWelcomeEmail,
} from '@/lib/email/ft9ja-to-partner';

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

    const shouldCompareLifecycle =
      'status' in body ||
      'monthly_fee_paid' in body ||
      'admin_pin' in body ||
      body.status === 'active';
    const existing = shouldCompareLifecycle ? await getPartnerPrivateBySlug(slug) : null;

    if ('admin_pin' in body) {
      if (!existing) {
        return Response.json({ error: 'Partner not found' }, { status: 404 });
      }

      const newPin = String(body.admin_pin || '');
      if (!isValidPartnerAdminPin(newPin)) {
        return Response.json({ error: 'Admin PIN must be 4 to 12 digits' }, { status: 400 });
      }

      const currentPin =
        typeof body.current_admin_pin === 'string' ? body.current_admin_pin : undefined;
      if (!partnerPinNeedsGeneration(existing.admin_pin) && existing.admin_pin !== currentPin) {
        return Response.json({ error: 'Current admin PIN is required' }, { status: 403 });
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
        body.admin_pin = generatePartnerAdminPin();
      }
    }

    const partner = await updatePartnerBySlug(slug, body);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (existing) {
      await sendPartnerLifecycleEmails(existing, partner);
    }

    const { admin_pin: _adminPin, ...partnerResponse } = partner;
    return Response.json(partnerResponse);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

async function sendPartnerLifecycleEmails(
  previous: NonNullable<Awaited<ReturnType<typeof getPartnerPrivateBySlug>>>,
  current: NonNullable<Awaited<ReturnType<typeof getPartnerPrivateBySlug>>>
) {
  const emails: Array<Promise<unknown>> = [];

  if (previous.status === 'pending' && current.status === 'active') {
    emails.push(sendPartnerWelcomeEmail(current));
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
