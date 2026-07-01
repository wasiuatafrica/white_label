import { desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { adminAuditLogs } from '../schema/admin-audit-logs';
import { adminUsers } from '../schema/admin-users';

export async function createAdminAuditLog(data: {
  adminUserId: number;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  const [row] = await db
    .insert(adminAuditLogs)
    .values({
      adminUserId: data.adminUserId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress ?? null,
    })
    .returning();
  return row ?? null;
}

export async function listAdminAuditLogs(limit = 200) {
  return db
    .select({
      id: adminAuditLogs.id,
      admin_user_id: adminAuditLogs.adminUserId,
      admin_email: adminUsers.email,
      admin_name: adminUsers.name,
      action: adminAuditLogs.action,
      resource_type: adminAuditLogs.resourceType,
      resource_id: adminAuditLogs.resourceId,
      metadata: adminAuditLogs.metadata,
      ip_address: adminAuditLogs.ipAddress,
      created_at: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .innerJoin(adminUsers, eq(adminAuditLogs.adminUserId, adminUsers.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);
}
