/**
 * Better Auth is disabled to avoid a second long-lived Neon WebSocket pool.
 * Platform/mobile `/account` auth is not used by partner, partner-admin, or
 * Super Admin flows (those use custom HMAC cookies).
 *
 * Re-enable only if mobile/platform account auth is needed again — and prefer
 * sharing the Drizzle pool rather than opening a second `@neondatabase/serverless` Pool.
 */

export const BETTER_AUTH_DISABLED = true;

export type Session = {
  user: { id: string; email: string; name: string; image?: string | null };
  session: { token: string };
};
