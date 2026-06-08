import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { evalStatusEnum, evalTypeEnum, payoutStatusEnum } from './enums';
import { partners } from './partners';
import { traderRequests } from './trader-requests';
import { traders } from './traders';

export const evaluations = pgTable(
  'evaluations',
  {
    id: serial('id').primaryKey(),
    traderId: integer('trader_id')
      .notNull()
      .references(() => traders.id, { onDelete: 'cascade' }),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    evalType: evalTypeEnum('eval_type').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    status: evalStatusEnum('status').notNull().default('pending_payment'),
    profitTarget: numeric('profit_target', { precision: 5, scale: 2 }).notNull().default('10.0'),
    currentProfit: numeric('current_profit', { precision: 5, scale: 2 }).notNull().default('0'),
    maxDrawdown: numeric('max_drawdown', { precision: 5, scale: 2 }).notNull().default('10.0'),
    currentDrawdown: numeric('current_drawdown', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    tradingDays: integer('trading_days').notNull().default(0),
    requiredDays: integer('required_days').notNull().default(30),
    payoutStatus: payoutStatusEnum('payout_status'),
    purchaseDate: timestamp('purchase_date', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [
    index('evaluations_partner_id_idx').on(table.partnerId),
    index('evaluations_trader_id_idx').on(table.traderId),
    index('evaluations_status_idx').on(table.status),
    index('evaluations_payout_status_idx').on(table.payoutStatus),
  ]
);

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  trader: one(traders, {
    fields: [evaluations.traderId],
    references: [traders.id],
  }),
  partner: one(partners, {
    fields: [evaluations.partnerId],
    references: [partners.id],
  }),
  requests: many(traderRequests),
}));

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
