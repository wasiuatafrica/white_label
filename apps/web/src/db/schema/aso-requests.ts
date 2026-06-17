import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { asoRequestStatusEnum } from './enums';
import { partners } from './partners';
import { traders } from './traders';
import { tradeAccounts } from './trade-accounts';

export const asoRequests = pgTable(
  'aso_requests',
  {
    id: serial('id').primaryKey(),
    traderId: integer('trader_id')
      .notNull()
      .references(() => traders.id, { onDelete: 'cascade' }),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    ssAccountId: integer('ss_account_id')
      .notNull()
      .references(() => tradeAccounts.id, { onDelete: 'cascade' }),
    ssAccountNumber: integer('ss_account_number').notNull(),
    status: asoRequestStatusEnum('status').notNull().default('pending'),
    requestedAt: timestamp('requested_at', { withTimezone: false }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: false }),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    rejectionReason: text('rejection_reason'),
    eligibilityProfit: numeric('eligibility_profit', { precision: 8, scale: 2 }),
    eligibilityProfitTarget: numeric('eligibility_profit_target', { precision: 8, scale: 2 }),
    eligibilityCheckedAt: timestamp('eligibility_checked_at', { withTimezone: false }),
    approvalTokenHash: varchar('approval_token_hash', { length: 64 }),
    approvalTokenExpiresAt: timestamp('approval_token_expires_at', { withTimezone: false }),
    approvalTokenUsedAt: timestamp('approval_token_used_at', { withTimezone: false }),
    asoAccountId: integer('aso_account_id').references(() => tradeAccounts.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('aso_requests_open_ss_account_idx')
      .on(table.ssAccountId)
      .where(sql`${table.status} IN ('pending', 'approved')`),
    uniqueIndex('aso_requests_completed_ss_account_idx')
      .on(table.ssAccountId)
      .where(sql`${table.status} = 'completed'`),
    index('aso_requests_status_requested_idx').on(table.status, table.requestedAt),
    index('aso_requests_trader_id_idx').on(table.traderId),
    index('aso_requests_partner_id_idx').on(table.partnerId),
    index('aso_requests_token_hash_idx').on(table.approvalTokenHash),
  ]
);

export const asoRequestsRelations = relations(asoRequests, ({ one }) => ({
  trader: one(traders, {
    fields: [asoRequests.traderId],
    references: [traders.id],
  }),
  partner: one(partners, {
    fields: [asoRequests.partnerId],
    references: [partners.id],
  }),
  ssAccount: one(tradeAccounts, {
    fields: [asoRequests.ssAccountId],
    references: [tradeAccounts.id],
  }),
  asoAccount: one(tradeAccounts, {
    fields: [asoRequests.asoAccountId],
    references: [tradeAccounts.id],
  }),
}));

export type AsoRequest = typeof asoRequests.$inferSelect;
export type NewAsoRequest = typeof asoRequests.$inferInsert;
