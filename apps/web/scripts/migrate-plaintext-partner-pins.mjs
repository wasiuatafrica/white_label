import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    UPDATE partners
    SET admin_pin = '0000', updated_at = NOW()
    WHERE admin_pin NOT LIKE '$argon2%'
      AND admin_pin <> '0000'
    RETURNING slug
  `;

  console.log(`Invalidated ${rows.length} legacy plaintext partner PIN(s).`);
  if (rows.length > 0) {
    console.log('Affected slugs:', rows.map((row) => row.slug).join(', '));
    console.log('Partners must reset PIN via forgot-PIN flow or Super Admin activation.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
