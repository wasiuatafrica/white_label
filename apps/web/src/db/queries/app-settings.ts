import { eq, sql } from 'drizzle-orm';
import { db } from '../index';
import { appSettings } from '../schema/app-settings';

export const SESSIONS_REVOKED_AT_KEY = 'sessions_revoked_at_ms';

export async function getSessionsRevokedAtMs(): Promise<number> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, SESSIONS_REVOKED_AT_KEY))
    .limit(1);

  if (!row) return 0;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function setSessionsRevokedAtMs(revokedAtMs: number): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      key: SESSIONS_REVOKED_AT_KEY,
      value: String(revokedAtMs),
      updatedAt: sql`NOW()`,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: String(revokedAtMs),
        updatedAt: sql`NOW()`,
      },
    });
}
