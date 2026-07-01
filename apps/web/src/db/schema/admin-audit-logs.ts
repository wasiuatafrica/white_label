import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users';

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  adminUserId: integer('admin_user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
});

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminAuditLogs.adminUserId],
    references: [adminUsers.id],
  }),
}));

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
