import 'dotenv/config';
import { neonConfig } from '@neondatabase/serverless';
import { defineConfig } from 'drizzle-kit';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
