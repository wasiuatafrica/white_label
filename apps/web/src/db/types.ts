import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { db } from './index';
import type * as schema from './schema';

export type DbClient = typeof db;
export type DbTransaction = PgTransaction<
  NeonQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type DbOrTx = DbClient | DbTransaction;
