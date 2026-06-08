import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { kycStatusEnum, traderStatusEnum } from './enums';
import { evaluations } from './evaluations';
import { partners } from './partners';
import { traderRequests } from './trader-requests';

export const traders = pgTable(
  'traders',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash'),
    status: traderStatusEnum('status').notNull().default('active'),
    resetToken: text('reset_token'),
    resetTokenExpires: timestamp('reset_token_expires', { withTimezone: false }),
    kycStatus: kycStatusEnum('kyc_status').notNull().default('not_started'),
    kycFullName: text('kyc_full_name'),
    kycIdType: varchar('kyc_id_type', { length: 50 }),
    kycIdNumber: varchar('kyc_id_number', { length: 100 }),
    kycIdUrl: text('kyc_id_url'),
    kycAddress: text('kyc_address'),
    kycSelfieUrl: text('kyc_selfie_url'),
    kycSubmittedAt: timestamp('kyc_submitted_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('traders_partner_email_idx').on(table.partnerId, table.email)]
);

export const tradersRelations = relations(traders, ({ one, many }) => ({
  partner: one(partners, {
    fields: [traders.partnerId],
    references: [partners.id],
  }),
  evaluations: many(evaluations),
  requests: many(traderRequests),
}));

export type Trader = typeof traders.$inferSelect;
export type NewTrader = typeof traders.$inferInsert;
