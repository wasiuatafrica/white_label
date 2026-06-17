import { eq, sql } from 'drizzle-orm';
import { db } from '../index';
import {
  partnerSignupEvents,
  type PartnerSignupEventFormData,
  type PartnerSignupEventStatus,
  type PartnerSignupEventStep,
} from '../schema/partner-signup-events';

export type TrackPartnerSignupEventInput = {
  attemptId: string;
  status: PartnerSignupEventStatus;
  lastStep: PartnerSignupEventStep;
  formData: PartnerSignupEventFormData;
  userAgent?: string | null;
};

export async function trackPartnerSignupEvent(data: TrackPartnerSignupEventInput) {
  const values = {
    attemptId: data.attemptId,
    status: data.status,
    lastStep: data.lastStep,
    firmName: data.formData.firm_name || null,
    slug: data.formData.slug || null,
    ownerName: data.formData.owner_name || null,
    ownerEmail: data.formData.owner_email || null,
    paymentMethod: data.formData.payment_method || null,
    formData: data.formData,
    userAgent: data.userAgent ?? null,
    abandonedAt: data.status === 'abandoned' ? sql`NOW()` : null,
    submittedAt: data.status === 'submitted' ? sql`NOW()` : null,
  };

  const [row] = await db
    .insert(partnerSignupEvents)
    .values(values)
    .onConflictDoUpdate({
      target: partnerSignupEvents.attemptId,
      set: {
        status: values.status,
        lastStep: values.lastStep,
        firmName: values.firmName,
        slug: values.slug,
        ownerName: values.ownerName,
        ownerEmail: values.ownerEmail,
        paymentMethod: values.paymentMethod,
        formData: values.formData,
        userAgent: values.userAgent,
        updatedAt: sql`NOW()`,
        abandonedAt:
          data.status === 'abandoned'
            ? sql`NOW()`
            : sql`${partnerSignupEvents.abandonedAt}`,
        submittedAt:
          data.status === 'submitted'
            ? sql`NOW()`
            : sql`${partnerSignupEvents.submittedAt}`,
      },
    })
    .returning({ id: partnerSignupEvents.id });

  return row;
}

export async function getPartnerSignupEventByAttemptId(attemptId: string) {
  const [row] = await db
    .select()
    .from(partnerSignupEvents)
    .where(eq(partnerSignupEvents.attemptId, attemptId))
    .limit(1);
  return row ?? null;
}
