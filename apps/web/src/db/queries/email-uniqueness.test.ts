// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';
import { applyPgliteSchema } from '@/db/pglite-schema';
import * as schema from '@/db/schema';
import { partners } from '@/db/schema/partners';
import { traders } from '@/db/schema/traders';
import type { DbOrTx } from '@/db/types';

describe('email uniqueness indexes', { timeout: 30_000 }, () => {
  async function setupTestDb() {
    const client = new PGlite();
    await client.waitReady;
    const db = drizzle({ client, schema }) as unknown as DbOrTx;
    await applyPgliteSchema(client);
    return { client, db };
  }

  it('rejects a second partner with the same owner email', async () => {
    const { client, db } = await setupTestDb();
    try {
      await db.insert(partners).values({
        slug: 'acme',
        firmName: 'Acme',
        ownerEmail: 'owner@example.com',
        adminPin: '123456',
      });

      await expect(
        db.insert(partners).values({
          slug: 'other',
          firmName: 'Other',
          ownerEmail: 'owner@example.com',
          adminPin: '123456',
        })
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });

  it('rejects the same trader email on a different partner', async () => {
    const { client, db } = await setupTestDb();
    try {
      const [acme] = await db
        .insert(partners)
        .values({
          slug: 'acme',
          firmName: 'Acme',
          ownerEmail: 'acme@example.com',
          adminPin: '123456',
        })
        .returning();
      const [other] = await db
        .insert(partners)
        .values({
          slug: 'other',
          firmName: 'Other',
          ownerEmail: 'other@example.com',
          adminPin: '123456',
        })
        .returning();

      await db.insert(traders).values({
        partnerId: acme.id,
        name: 'Ada',
        email: 'trader@example.com',
      });

      await expect(
        db.insert(traders).values({
          partnerId: other.id,
          name: 'Ada',
          email: 'trader@example.com',
        })
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
});
