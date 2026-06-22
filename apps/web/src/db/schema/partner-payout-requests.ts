import { relations } from 'drizzle-orm';
import { index, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { partnerPayoutRequestStatusEnum } from './enums';
import { partners } from './partners';

export const partnerPayoutRequests = pgTable(
  'partner_payout_requests',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    amountRequested: numeric('amount_requested', { precision: 14, scale: 2 }).notNull(),
    bankName: text('bank_name').notNull(),
    accountNumber: text('account_number').notNull(),
    accountName: text('account_name').notNull(),
    notes: text('notes'),
    adminNotes: text('admin_notes'),
    status: partnerPayoutRequestStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: false }),
  },
  (table) => [
    index('partner_payout_requests_partner_status_idx').on(table.partnerId, table.status),
  ]
);

export const partnerPayoutRequestsRelations = relations(partnerPayoutRequests, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerPayoutRequests.partnerId],
    references: [partners.id],
  }),
}));

export type PartnerPayoutRequest = typeof partnerPayoutRequests.$inferSelect;
export type NewPartnerPayoutRequest = typeof partnerPayoutRequests.$inferInsert;
