import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { applyPgliteSchema } from './pglite-schema';
import { pgliteDataDir } from './pglite-env';
import * as schema from './schema';

type LocalPgliteDb = PgliteDatabase<typeof schema> & { $client: PGlite };

type PgliteGlobal = typeof globalThis & {
  __ft9jaPglite?: PGlite;
  __ft9jaPgliteDb?: LocalPgliteDb;
  __ft9jaPgliteSchema?: Promise<void>;
};

function getPgliteClient() {
  const globalForPglite = globalThis as PgliteGlobal;
  if (!globalForPglite.__ft9jaPglite) {
    globalForPglite.__ft9jaPglite = new PGlite(pgliteDataDir());
  }
  return globalForPglite.__ft9jaPglite;
}

export function getPgliteDb(): LocalPgliteDb {
  const globalForPglite = globalThis as PgliteGlobal;
  if (!globalForPglite.__ft9jaPgliteDb) {
    globalForPglite.__ft9jaPgliteDb = drizzle({
      client: getPgliteClient(),
      schema,
    });
  }
  return globalForPglite.__ft9jaPgliteDb;
}

export async function ensurePgliteSchema() {
  const globalForPglite = globalThis as PgliteGlobal;
  if (!globalForPglite.__ft9jaPgliteSchema) {
    getPgliteDb();
    globalForPglite.__ft9jaPgliteSchema = applyPgliteSchema(getPgliteClient()).then(() => undefined);
  }
  await globalForPglite.__ft9jaPgliteSchema;
}
