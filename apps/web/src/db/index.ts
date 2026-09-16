import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { pgliteDataDir, usesPglite } from './pglite-env';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;

function createNeonDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  return drizzleNeon(pool, { schema });
}

type AppDatabase = ReturnType<typeof createNeonDb>;
type DbGlobal = typeof globalThis & { __ft9jaAppPgliteDb?: AppDatabase };

let neonDb: AppDatabase | undefined;

function getDb(): AppDatabase {
  if (usesPglite()) {
    const cached = (globalThis as DbGlobal).__ft9jaAppPgliteDb;
    if (!cached) {
      throw new Error('Local PGlite is not initialized. ensureLocalSchema() must run first.');
    }
    return cached;
  }
  neonDb ??= createNeonDb();
  return neonDb;
}

// Query modules are typed against the Neon driver. PGlite is API-compatible at runtime.
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

  // Keep PGlite out of the Neon module graph (jsdom tests import query modules).
  const { ensurePgliteSchema, getPgliteDb } = await import('./pglite-db');
  (globalThis as DbGlobal).__ft9jaAppPgliteDb = getPgliteDb() as unknown as AppDatabase;
  await ensurePgliteSchema();
}

export function localPgliteDataDir() {
  return usesPglite() ? pgliteDataDir() : null;
}
