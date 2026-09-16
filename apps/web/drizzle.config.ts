import 'dotenv/config';
import { neonConfig } from '@neondatabase/serverless';
import { defineConfig } from 'drizzle-kit';
import ws from 'ws';
import { pgliteDataDir, usesPglite } from './src/db/pglite-env';

const pglite = usesPglite();

if (!pglite) {
  neonConfig.webSocketConstructor = ws;
}

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
