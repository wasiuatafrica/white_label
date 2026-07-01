import { parseAdminSessionFromRequest } from '@/lib/admin-session';

/** @deprecated Use requireAdmin from admin-auth-guard instead */
export function requestHasAdminSession(request: Request, _secret: string) {
  return Boolean(parseAdminSessionFromRequest(request));
}
