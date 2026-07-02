import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const SESSIONS_REVOKED_AT_KEY = 'sessions_revoked_at_ms';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(databaseUrl);

  const tableCheck = await sql`
    SELECT to_regclass('public.app_settings') AS table_name
  `;
  if (!tableCheck[0]?.table_name) {
    throw new Error('app_settings table is missing. Run: yarn db:push');
  }

  const revokedAtMs = Date.now();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${SESSIONS_REVOKED_AT_KEY}, ${String(revokedAtMs)}, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;

  let betterAuthDeleted = 0;
  try {
    const deleted = await sql`DELETE FROM session RETURNING id`;
    betterAuthDeleted = deleted.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('does not exist') && !message.includes('relation "session"')) {
      throw error;
    }
    console.warn('Better Auth session table not found; skipped DB session delete.');
  }

  console.log('All sessions revoked.');
  console.log(`- Revocation timestamp (ms): ${revokedAtMs}`);
  console.log(`- Better Auth sessions deleted: ${betterAuthDeleted}`);
  console.log('- Partner admin, trader, and Super Admin cookies issued before this moment are now invalid.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
