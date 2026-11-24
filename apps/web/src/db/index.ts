import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgliteDataDir, usesPglite } from './pglite-env';
import * as schema from './schema';

function createPgDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client losing its connection (DB restart, network blip) emits 'error' on the pool;
  // unhandled, that would crash the server. The pool discards the client and reconnects on demand.
  pool.on('error', (error) => {
    console.error('[db] idle client error', error);
  });
  return drizzlePg(pool, { schema });
}

type AppDatabase = ReturnType<typeof createPgDb>;
type DbGlobal = typeof globalThis & { __ft9jaAppPgliteDb?: AppDatabase };

let pgDb: AppDatabase | undefined;

function getDb(): AppDatabase {
  if (usesPglite()) {
    const cached = (globalThis as DbGlobal).__ft9jaAppPgliteDb;
    if (!cached) {
      throw new Error('Local PGlite is not initialized. ensureLocalSchema() must run first.');
    }
    return cached;
  }
  pgDb ??= createPgDb();
  return pgDb;
}

// Query modules are typed against the node-postgres driver. PGlite is API-compatible at runtime.
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === 'function' ? value.bind(getDb()) : value;
  },
});

export async function ensureLocalSchema() {
  if (!usesPglite()) {
    return;
  }

  // Keep PGlite out of the Postgres module graph (jsdom tests import query modules).
  const { ensurePgliteSchema, getPgliteDb } = await import('./pglite-db');
  (globalThis as DbGlobal).__ft9jaAppPgliteDb = getPgliteDb() as unknown as AppDatabase;
  await ensurePgliteSchema();
}

export function localPgliteDataDir() {
  return usesPglite() ? pgliteDataDir() : null;
}
