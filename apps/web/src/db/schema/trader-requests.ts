import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { traderRequestStatusEnum, traderRequestTypeEnum } from './enums';
import { evaluations } from './evaluations';
import { partners } from './partners';
import { traders } from './traders';

export const traderRequests = pgTable(
  'trader_requests',
  {
    id: serial('id').primaryKey(),
    traderId: integer('trader_id')
      .notNull()
      .references(() => traders.id, { onDelete: 'cascade' }),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    evalId: integer('eval_id')
      .notNull()
      .references(() => evaluations.id, { onDelete: 'cascade' }),
    requestType: traderRequestTypeEnum('request_type').notNull(),
    notes: text('notes'),
    adminNotes: text('admin_notes'),
    status: traderRequestStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [
    index('trader_requests_eval_type_status_idx').on(
      table.evalId,
      table.requestType,
      table.status
    ),
    index('trader_requests_trader_id_idx').on(table.traderId),
    index('trader_requests_partner_id_idx').on(table.partnerId),
  ]
);

export const traderRequestsRelations = relations(traderRequests, ({ one }) => ({
  trader: one(traders, {
    fields: [traderRequests.traderId],
    references: [traders.id],
  }),
  partner: one(partners, {
    fields: [traderRequests.partnerId],
    references: [partners.id],
  }),
  evaluation: one(evaluations, {
    fields: [traderRequests.evalId],
    references: [evaluations.id],
  }),
}));

export type TraderRequest = typeof traderRequests.$inferSelect;
export type NewTraderRequest = typeof traderRequests.$inferInsert;
