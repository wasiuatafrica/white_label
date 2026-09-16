import path from 'node:path';
import { fileURLToPath } from 'node:url';

import argon2 from 'argon2';
import { PGlite } from '@electric-sql/pglite';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

const MAX_ADMINS = 5;
const PGLITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.pglite');
const USAGE = 'Usage: yarn local:admin <email> <name> <password>';

const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
});

function printUsage() {
  console.error(`${USAGE}\nPassword must be at least 12 characters.`);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function createLocalAdmin(email, name, password) {
  let client;

  try {
    client = new PGlite(PGLITE_DIR);
    const db = drizzle(client);

    const [adminCount] = await db.select({ value: count() }).from(adminUsers);
    if (Number(adminCount?.value ?? 0) >= MAX_ADMINS) {
      throw new Error(`Maximum of ${MAX_ADMINS} local admins already exists.`);
    }

    const [existing] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing) {
      throw new Error(`A local admin already exists for ${email}.`);
    }

    const [created] = await db
      .insert(adminUsers)
      .values({
        email,
        name,
        passwordHash: await argon2.hash(password),
      })
      .returning({
        email: adminUsers.email,
      });

    if (!created) {
      throw new Error('The local admin could not be created.');
    }

    console.log(`Local admin created: ${created.email}`);
  } catch (error) {
    const message = getErrorMessage(error);

    if (/admin_users|does not exist/i.test(message)) {
      throw new Error(
        'The local PGlite schema is not initialized. Start the app once with `yarn workspace web dev:pglite` or run `yarn db:push:pglite` first.'
      );
    }

    throw error;
  } finally {
    await client?.close();
  }
}

const [emailArg, nameArg, password] = process.argv.slice(2);

if (emailArg === '--help' || emailArg === '-h') {
  console.log(`${USAGE}\nPassword must be at least 12 characters.`);
} else {
  const email = emailArg?.trim().toLowerCase();
  const name = nameArg?.trim();

  if (!email || !email.includes('@') || !name || !password || password.length < 12) {
    printUsage();
    process.exitCode = 1;
  } else {
    try {
      await createLocalAdmin(email, name, password);
    } catch (error) {
      console.error(getErrorMessage(error));
      process.exitCode = 1;
    }
  }
}
