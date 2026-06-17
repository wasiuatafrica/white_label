import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(databaseUrl);

  await sql`
    ALTER TABLE partners
    ADD COLUMN IF NOT EXISTS logo_generation_count integer NOT NULL DEFAULT 0
  `;

  await sql`
    UPDATE partners
    SET logo_generation_count = 1
    WHERE logo_generated_at IS NOT NULL
      AND logo_generation_count < 1
  `;

  await sql`
    ALTER TABLE partners
    DROP COLUMN IF EXISTS logo_generated_at
  `;

  const rows = await sql`
    SELECT
      COUNT(*)::int AS partners,
      COALESCE(SUM(logo_generation_count), 0)::int AS total_generations_used
    FROM partners
  `;

  console.log('Logo generation count migration complete.');
  console.log(rows[0]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
