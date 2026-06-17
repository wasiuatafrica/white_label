import {
  trackPartnerSignupEvent,
  type TrackPartnerSignupEventInput,
} from '@/db/queries/partner-signup-events';
import type {
  PartnerSignupEventFormData,
  PartnerSignupEventStatus,
  PartnerSignupEventStep,
} from '@/db/schema/partner-signup-events';

const STATUSES = new Set<PartnerSignupEventStatus>([
  'started',
  'continued',
  'payment_started',
  'abandoned',
  'submitted',
]);

const STEPS = new Set<PartnerSignupEventStep>(['details', 'branding', 'payment', 'review']);

function readString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function sanitizeFormData(value: unknown): PartnerSignupEventFormData {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    firm_name: readString(input.firm_name, 255),
    slug: readString(input.slug, 100),
    owner_name: readString(input.owner_name, 255),
    owner_email: readString(input.owner_email, 255),
    tagline: readString(input.tagline, 500),
    description: readString(input.description, 2000),
    brand_color: readString(input.brand_color, 7),
    secondary_color: readString(input.secondary_color, 7),
    payment_method: readString(input.payment_method, 32),
    has_payment_proof: readBoolean(input.has_payment_proof),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const attemptId = readString(body.attempt_id, 64);
    const status = readString(body.status, 32);
    const lastStep = readString(body.last_step, 32);

    if (!attemptId || !status || !STATUSES.has(status as PartnerSignupEventStatus)) {
      return Response.json({ error: 'Valid attempt_id and status are required' }, { status: 400 });
    }

    if (!lastStep || !STEPS.has(lastStep as PartnerSignupEventStep)) {
      return Response.json({ error: 'Valid last_step is required' }, { status: 400 });
    }

    const input: TrackPartnerSignupEventInput = {
      attemptId,
      status: status as PartnerSignupEventStatus,
      lastStep: lastStep as PartnerSignupEventStep,
      formData: sanitizeFormData(body.form_data),
      userAgent: request.headers.get('user-agent'),
    };

    await trackPartnerSignupEvent(input);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to track signup event' }, { status: 500 });
  }
}
