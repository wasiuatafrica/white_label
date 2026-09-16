// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';
import { applyPgliteSchema } from './pglite-schema';
import * as schema from './schema';
import { partners } from './schema/partners';

describe('PGlite schema apply', () => {
  it(
    'creates tables from the Drizzle schema on an empty PGlite database',
    async () => {
      const client = new PGlite();
      await client.waitReady;
      try {
        const db = drizzle({ client, schema });
        await expect(applyPgliteSchema(client)).resolves.toBe('applied');
        await expect(applyPgliteSchema(client)).resolves.toBe('already-initialized');

        const rows = await db.select({ id: partners.id }).from(partners).limit(1);
        expect(rows).toEqual([]);

        const tables = await db.execute<{ table_name: string }>(
          sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners'`
        );
        expect(tables.rows.map((row) => row.table_name)).toEqual(['partners']);
      } finally {
        await client.close();
      }
    },
    60_000
  );
});
