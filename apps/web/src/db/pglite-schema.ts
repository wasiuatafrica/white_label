import type { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

export async function applyPgliteSchema(client: PGlite) {
  const existing = await client.query<{ rel: string | null }>(
    "SELECT to_regclass('public.partners') AS rel"
  );
  if (existing.rows[0]?.rel) {
    return 'already-initialized' as const;
  }

  // drizzle-kit is a devDependency; load it only when initializing local PGlite.
  const { generateDrizzleJson, generateMigration } = await import('drizzle-kit/api');
  const empty = generateDrizzleJson({});
  const current = generateDrizzleJson(schema);
  const statements = await generateMigration(empty, current);
  if (statements.length === 0) {
    throw new Error('Failed to generate PGlite schema SQL from the Drizzle schema.');
  }

  for (const statement of statements) {
    await client.exec(statement);
  }
  return 'applied' as const;
}
