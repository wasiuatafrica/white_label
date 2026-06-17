import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { evaluations } from './evaluations';
import { partners } from './partners';
import { traders } from './traders';

export const tradeAccounts = pgTable(
  'trade_accounts',
  {
    id: serial('id').primaryKey(),
    traderId: integer('trader_id')
      .notNull()
      .references(() => traders.id, { onDelete: 'cascade' }),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    evaluationId: integer('evaluation_id').references(() => evaluations.id, { onDelete: 'cascade' }),
    number: integer('number').notNull().default(0),
    password: text('password').notNull().default(''),
    investorPassword: text('investor_password').notNull().default(''),
    platform: varchar('platform', { length: 255 }).notNull().default('MT5'),
    typeOfAccount: varchar('typeofaccount', { length: 30 }).notNull(),
    broker: varchar('broker', { length: 255 }).notNull().default('Deriv-Demo'),
    accSize: varchar('acc_size', { length: 255 }).notNull().default('$10,000'),
    payout: varchar('payout', { length: 255 }),
    hasAso: integer('has_aso'),
    asoAccountId: integer('aso_account_id'),
    asoSourceAccountId: integer('aso_source_account_id'),
    asoAccountNumber: integer('aso_account_number'),
    timeToAso: integer('time_to_aso'),
    profitTarget: numeric('profit_target', { precision: 5, scale: 2 }),
    creationCode: varchar('creation_code', { length: 8 }).notNull(),
    blown: boolean('blown').notNull().default(false),
    inactive: boolean('inactive').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('trade_accounts_evaluation_id_idx')
      .on(table.evaluationId)
      .where(sql`${table.evaluationId} IS NOT NULL`),
    uniqueIndex('trade_accounts_aso_account_id_idx')
      .on(table.asoAccountId)
      .where(sql`${table.asoAccountId} IS NOT NULL`),
    uniqueIndex('trade_accounts_aso_source_account_id_idx')
      .on(table.asoSourceAccountId)
      .where(sql`${table.asoSourceAccountId} IS NOT NULL`),
    uniqueIndex('trade_accounts_aso_number_idx')
      .on(table.number)
      .where(sql`${table.typeOfAccount} = 'Aso'`),
    uniqueIndex('trade_accounts_creation_code_idx').on(table.creationCode),
    index('trade_accounts_trader_id_idx').on(table.traderId),
    index('trade_accounts_partner_id_idx').on(table.partnerId),
    index('trade_accounts_number_idx').on(table.number),
  ]
);

export const tradeAccountsRelations = relations(tradeAccounts, ({ one }) => ({
  trader: one(traders, {
    fields: [tradeAccounts.traderId],
    references: [traders.id],
  }),
  partner: one(partners, {
    fields: [tradeAccounts.partnerId],
    references: [partners.id],
  }),
  evaluation: one(evaluations, {
    fields: [tradeAccounts.evaluationId],
    references: [evaluations.id],
  }),
}));

export type TradeAccount = typeof tradeAccounts.$inferSelect;
export type NewTradeAccount = typeof tradeAccounts.$inferInsert;
