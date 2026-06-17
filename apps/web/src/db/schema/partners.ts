import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { partnerStatusEnum, partnerTemplateEnum } from './enums';
import { evaluations } from './evaluations';
import { partnerPayoutRequests } from './partner-payout-requests';
import { traderRequests } from './trader-requests';
import { traders } from './traders';

export const partners = pgTable(
  'partners',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull(),
    firmName: varchar('firm_name', { length: 255 }).notNull(),
    ownerName: varchar('owner_name', { length: 255 }),
    ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
    logoUrl: text('logo_url'),
    brandColor: varchar('brand_color', { length: 7 }).notNull().default('#16A34A'),
    secondaryColor: varchar('secondary_color', { length: 7 }).notNull().default('#F59E0B'),
    tagline: text('tagline').default('Trade smarter...'),
    description: text('description'),
    template: partnerTemplateEnum('template').notNull().default('minimal'),
    status: partnerStatusEnum('status').notNull().default('pending'),
    adminPin: varchar('admin_pin', { length: 20 }).notNull(),
    feeMarkup: numeric('fee_markup', { precision: 10, scale: 2 }).notNull().default('0'),
    monthlyFeePaid: boolean('monthly_fee_paid').notNull().default(false),
    setupFeeWaived: boolean('setup_fee_waived').notNull().default(false),
    totalTraders: integer('total_traders').notNull().default(0),
    totalRevenue: numeric('total_revenue', { precision: 14, scale: 2 }).notNull().default('0'),
    paymentProofUrl: text('payment_proof_url'),
    logoGenerationCount: integer('logo_generation_count').notNull().default(0),
    lastGeneratedLogoUrl: text('last_generated_logo_url'),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('partners_slug_idx').on(table.slug)]
);

export const partnersRelations = relations(partners, ({ many }) => ({
  traders: many(traders),
  evaluations: many(evaluations),
  traderRequests: many(traderRequests),
  payoutRequests: many(partnerPayoutRequests),
}));

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
