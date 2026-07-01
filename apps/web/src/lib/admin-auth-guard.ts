import { createAdminAuditLog } from '@/db/queries/admin-audit-logs';
import { getAdminUserById } from '@/db/queries/admin-users';
import { parseAdminSessionFromRequest } from '@/lib/admin-session';

export type AdminContext = {
  admin: {
    id: number;
    email: string;
    name: string;
  };
};

export function isAdminUnauthorized(result: AdminContext | Response): result is Response {
  return result instanceof Response;
}

export async function requireAdmin(request: Request): Promise<AdminContext | Response> {
  const session = parseAdminSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getAdminUserById(session.adminUserId);
  if (!user || !user.isActive || !user.totpEnabled) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return {
    admin: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

export async function logAdminAction(params: {
  adminUserId: number;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  request: Request;
}) {
  await createAdminAuditLog({
    adminUserId: params.adminUserId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId:
      params.resourceId == null || params.resourceId === ''
        ? null
        : String(params.resourceId),
    metadata: params.metadata ?? null,
    ipAddress: getRequestIp(params.request),
  });
}
