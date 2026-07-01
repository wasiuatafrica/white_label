import { count, desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { adminUsers } from '../schema/admin-users';

export const MAX_ADMIN_USERS = 5;

export async function countAdminUsers() {
  const [row] = await db.select({ value: count() }).from(adminUsers);
  return row?.value ?? 0;
}

export async function listAdminUsers() {
  return db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      totp_enabled: adminUsers.totpEnabled,
      is_active: adminUsers.isActive,
      last_login_at: adminUsers.lastLoginAt,
      created_at: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt));
}

export async function getAdminUserById(id: number) {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row ?? null;
}

export async function getAdminUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized))
    .limit(1);
  return row ?? null;
}

export async function createAdminUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  createdByAdminId?: number | null;
}) {
  const [row] = await db
    .insert(adminUsers)
    .values({
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      passwordHash: data.passwordHash,
      createdByAdminId: data.createdByAdminId ?? null,
    })
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      totp_enabled: adminUsers.totpEnabled,
      is_active: adminUsers.isActive,
      created_at: adminUsers.createdAt,
    });
  return row ?? null;
}

export async function updateAdminUserLastLogin(id: number) {
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export async function setAdminUserTotpSecret(id: number, secret: string) {
  await db
    .update(adminUsers)
    .set({ totpSecret: secret, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export async function enableAdminUserTotp(id: number) {
  await db
    .update(adminUsers)
    .set({ totpEnabled: true, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export async function resetAdminUserTotp(id: number) {
  await db
    .update(adminUsers)
    .set({ totpSecret: null, totpEnabled: false, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export async function setAdminUserActive(id: number, isActive: boolean) {
  const [row] = await db
    .update(adminUsers)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(adminUsers.id, id))
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      is_active: adminUsers.isActive,
    });
  return row ?? null;
}

export async function updateAdminUserPassword(id: number, passwordHash: string) {
  await db
    .update(adminUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}
