import 'dotenv/config';
import { createSql } from './lib/pg-sql.mjs';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = createSql(databaseUrl);

  await sql`
    ALTER TABLE partners
    ADD COLUMN IF NOT EXISTS last_generated_logo_url text
  `;

  console.log('Added partners.last_generated_logo_url when missing.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
