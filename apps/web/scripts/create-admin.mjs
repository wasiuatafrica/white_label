import 'dotenv/config';
import argon2 from 'argon2';
import { neon } from '@neondatabase/serverless';

const MAX_ADMINS = 5;

function usage() {
  console.error('Usage: yarn workspace web create-admin <email> <name> <password>');
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const [emailArg, nameArg, password] = process.argv.slice(2);
if (!emailArg || !nameArg || !password) usage();

const email = emailArg.trim().toLowerCase();
const name = nameArg.trim();

if (!email.includes('@') || !name || password.length < 12) usage();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(databaseUrl);

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM admin_users`;
  if (count >= MAX_ADMINS) {
    throw new Error(`Maximum of ${MAX_ADMINS} admins already exists.`);
  }

  const existing = await sql`
    SELECT id FROM admin_users WHERE email = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    throw new Error(`Admin already exists for ${email}`);
  }

  const passwordHash = await argon2.hash(password);
  const rows = await sql`
    INSERT INTO admin_users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id, email, name
  `;

  console.log('Admin created:', rows[0]);
  console.log('Sign in at /admin and complete authenticator setup on first login.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
