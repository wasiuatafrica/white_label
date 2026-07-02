import { parseAdminSessionFromRequest } from '@/lib/admin-session';

/** @deprecated Use requireAdmin from admin-auth-guard instead */
export async function requestHasAdminSession(request: Request, _secret: string) {
  return Boolean(await parseAdminSessionFromRequest(request));
}
