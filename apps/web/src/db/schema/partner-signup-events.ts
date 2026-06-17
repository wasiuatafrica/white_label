import { jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export type PartnerSignupEventStatus = 'started' | 'continued' | 'payment_started' | 'abandoned' | 'submitted';

export type PartnerSignupEventStep = 'details' | 'branding' | 'payment' | 'review';

export type PartnerSignupEventFormData = {
  firm_name?: string;
  slug?: string;
  owner_name?: string;
  owner_email?: string;
  tagline?: string;
  description?: string;
  brand_color?: string;
  secondary_color?: string;
  payment_method?: string;
  has_payment_proof?: boolean;
};

export const partnerSignupEvents = pgTable(
  'partner_signup_events',
  {
    id: serial('id').primaryKey(),
    attemptId: varchar('attempt_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('started'),
    lastStep: varchar('last_step', { length: 32 }).notNull().default('details'),
    firmName: varchar('firm_name', { length: 255 }),
    slug: varchar('slug', { length: 100 }),
    ownerName: varchar('owner_name', { length: 255 }),
    ownerEmail: varchar('owner_email', { length: 255 }),
    paymentMethod: varchar('payment_method', { length: 32 }),
    formData: jsonb('form_data').$type<PartnerSignupEventFormData>().notNull().default({}),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
    abandonedAt: timestamp('abandoned_at', { withTimezone: false }),
    submittedAt: timestamp('submitted_at', { withTimezone: false }),
  },
  (table) => [uniqueIndex('partner_signup_events_attempt_id_idx').on(table.attemptId)]
);

export type PartnerSignupEvent = typeof partnerSignupEvents.$inferSelect;
export type NewPartnerSignupEvent = typeof partnerSignupEvents.$inferInsert;
