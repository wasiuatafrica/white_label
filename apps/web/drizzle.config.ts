import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { pgliteDataDir, usesPglite } from './src/db/pglite-env';

const pglite = usesPglite();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(pglite
    ? {
        driver: 'pglite' as const,
        dbCredentials: {
          url: pgliteDataDir(),
        },
      }
    : {
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      }),
});
