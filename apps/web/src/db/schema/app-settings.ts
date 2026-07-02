import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;
