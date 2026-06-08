import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../index';
import { mapTrader } from '../mappers';
import type { DbOrTx } from '../types';
import { traders } from '../schema/traders';
import { incrementPartnerTraders } from './partners';

export async function listTradersByPartnerId(partnerId: number) {
  const rows = await db
    .select()
    .from(traders)
    .where(eq(traders.partnerId, partnerId))
    .orderBy(sql`${traders.createdAt} DESC`);
  return rows.map(mapTrader);
}

export async function getTraderByEmail(partnerId: number, email: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select()
    .from(traders)
    .where(and(eq(traders.email, email), eq(traders.partnerId, partnerId)))
    .limit(1);
  return row ? mapTrader(row) : null;
}

export async function getTraderById(traderId: number) {
  const [row] = await db.select().from(traders).where(eq(traders.id, traderId)).limit(1);
  return row ? mapTrader(row) : null;
}

export async function getTraderProfile(traderId: number) {
  const [row] = await db
    .select({
      id: traders.id,
      name: traders.name,
      email: traders.email,
      status: traders.status,
      kyc_status: traders.kycStatus,
      created_at: traders.createdAt,
    })
    .from(traders)
    .where(eq(traders.id, traderId))
    .limit(1);
  return row ?? null;
}

export async function getTraderForSession(traderId: number, partnerId: number) {
  const [row] = await db
    .select({
      id: traders.id,
      name: traders.name,
      email: traders.email,
      status: traders.status,
      kyc_status: traders.kycStatus,
    })
    .from(traders)
    .where(and(eq(traders.id, traderId), eq(traders.partnerId, partnerId)))
    .limit(1);
  return row ?? null;
}

export async function getTraderForLogin(partnerId: number, email: string) {
  const [row] = await db
    .select({
      id: traders.id,
      name: traders.name,
      email: traders.email,
      status: traders.status,
      password_hash: traders.passwordHash,
    })
    .from(traders)
    .where(and(eq(traders.email, email), eq(traders.partnerId, partnerId)))
    .limit(1);
  return row ?? null;
}

export async function getTraderPasswordHash(traderId: number) {
  const [row] = await db
    .select({ password_hash: traders.passwordHash })
    .from(traders)
    .where(eq(traders.id, traderId))
    .limit(1);
  return row?.password_hash ?? null;
}

export async function traderEmailExists(partnerId: number, email: string) {
  const [row] = await db
    .select({ id: traders.id })
    .from(traders)
    .where(and(eq(traders.email, email), eq(traders.partnerId, partnerId)))
    .limit(1);
  return Boolean(row);
}

export async function createTraderWithCount(data: {
  partnerId: number;
  name: string;
  email: string;
  passwordHash?: string | null;
}) {
  return db.transaction(async (tx) => {
    const trader = await createTrader(data, tx);
    await incrementPartnerTraders(data.partnerId, tx);
    return trader;
  });
}

export async function createTrader(
  data: {
    partnerId: number;
    name: string;
    email: string;
    passwordHash?: string | null;
  },
  tx: DbOrTx = db
) {
  const [row] = await tx
    .insert(traders)
    .values({
      partnerId: data.partnerId,
      name: data.name,
      email: data.email,
      status: 'active',
      passwordHash: data.passwordHash ?? null,
    })
    .returning();
  return mapTrader(row);
}

export async function updateTraderProfile(
  traderId: number,
  updates: { name?: string; passwordHash?: string }
) {
  const set: { name?: string; passwordHash?: string } = {};
  if (updates.name) set.name = updates.name;
  if (updates.passwordHash) set.passwordHash = updates.passwordHash;
  if (Object.keys(set).length === 0) return null;

  const [row] = await db
    .update(traders)
    .set(set)
    .where(eq(traders.id, traderId))
    .returning({ id: traders.id, name: traders.name, email: traders.email, status: traders.status });
  return row ?? null;
}

export async function getTraderForPasswordSetup(
  traderId: number,
  email: string,
  partnerId: number
) {
  const [row] = await db
    .select({ id: traders.id, name: traders.name, email: traders.email })
    .from(traders)
    .where(
      and(
        eq(traders.id, traderId),
        eq(traders.email, email),
        eq(traders.partnerId, partnerId),
        isNull(traders.passwordHash)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function setTraderPassword(traderId: number, passwordHash: string) {
  await db.update(traders).set({ passwordHash }).where(eq(traders.id, traderId));
}

export async function getTraderKyc(traderId: number) {
  const [row] = await db
    .select({
      kyc_status: traders.kycStatus,
      kyc_full_name: traders.kycFullName,
      kyc_id_type: traders.kycIdType,
      kyc_id_number: traders.kycIdNumber,
      kyc_id_url: traders.kycIdUrl,
      kyc_address: traders.kycAddress,
      kyc_selfie_url: traders.kycSelfieUrl,
      kyc_submitted_at: traders.kycSubmittedAt,
    })
    .from(traders)
    .where(eq(traders.id, traderId))
    .limit(1);
  return row ?? null;
}

export async function submitTraderKyc(
  traderId: number,
  data: {
    fullName: string;
    idType: string;
    idNumber: string;
    idUrl: string;
    address: string;
    selfieUrl?: string | null;
  }
) {
  await db
    .update(traders)
    .set({
      kycStatus: 'submitted',
      kycFullName: data.fullName,
      kycIdType: data.idType,
      kycIdNumber: data.idNumber,
      kycIdUrl: data.idUrl,
      kycAddress: data.address,
      kycSelfieUrl: data.selfieUrl ?? null,
      kycSubmittedAt: sql`NOW()`,
    })
    .where(eq(traders.id, traderId));
}

export async function updateTraderKycStatus(
  traderId: number,
  kycStatus: 'approved' | 'rejected',
  partnerId?: number
) {
  const conditions = partnerId
    ? and(eq(traders.id, traderId), eq(traders.partnerId, partnerId))
    : eq(traders.id, traderId);
  await db.update(traders).set({ kycStatus }).where(conditions);
}

export async function getTraderForReset(partnerId: number, email: string) {
  const [row] = await db
    .select({ id: traders.id, name: traders.name })
    .from(traders)
    .where(and(eq(traders.email, email), eq(traders.partnerId, partnerId)))
    .limit(1);
  return row ?? null;
}

export async function setTraderResetToken(traderId: number, token: string, expires: Date) {
  await db
    .update(traders)
    .set({ resetToken: token, resetTokenExpires: expires })
    .where(eq(traders.id, traderId));
}

export async function getTraderByResetToken(partnerId: number, email: string, token: string) {
  const [row] = await db
    .select({ id: traders.id })
    .from(traders)
    .where(
      and(
        eq(traders.email, email),
        eq(traders.partnerId, partnerId),
        eq(traders.resetToken, token),
        gt(traders.resetTokenExpires, sql`NOW()`)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function completePasswordReset(traderId: number, passwordHash: string) {
  await db
    .update(traders)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    })
    .where(eq(traders.id, traderId));
}
