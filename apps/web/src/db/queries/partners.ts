import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { generatePartnerAdminPin, partnerPinNeedsGeneration } from '@/lib/admin-pin';
import { emailsMatch } from '@/lib/email-compare';
import {
  hashPartnerAdminPin,
  verifyPartnerAdminPin,
} from '@/lib/partner-pin-crypto';
import { MAX_PARTNER_LOGO_GENERATIONS } from '@/lib/openai/logo-limits';
import type { DbOrTx } from '../types';
import { mapPartner, mapPartnerForSuperAdmin, mapPartnerPublic } from '../mappers';
import { partners } from '../schema/partners';

export async function listPartners() {
  const rows = await db.select().from(partners).orderBy(sql`${partners.createdAt} DESC`);
  return rows.map(mapPartnerForSuperAdmin);
}

const PARTNER_ID_CACHE_TTL_MS = 60_000;
const partnerIdBySlugCache = new Map<string, { id: number | null; expiresAt: number }>();

export function invalidatePartnerIdBySlugCache(slug?: string) {
  if (slug) {
    partnerIdBySlugCache.delete(slug);
    return;
  }
  partnerIdBySlugCache.clear();
}

export async function getPartnerIdBySlug(slug: string) {
  const now = Date.now();
  const cached = partnerIdBySlugCache.get(slug);
  if (cached && now < cached.expiresAt) {
    return cached.id;
  }

  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  const id = row?.id ?? null;
  partnerIdBySlugCache.set(slug, { id, expiresAt: now + PARTNER_ID_CACHE_TTL_MS });
  return id;
}

export async function getPartnerBySlug(slug: string) {
  const [row] = await db.select().from(partners).where(eq(partners.slug, slug)).limit(1);
  return row ? mapPartnerPublic(row) : null;
}

export async function getPartnerPrivateBySlug(slug: string) {
  const [row] = await db.select().from(partners).where(eq(partners.slug, slug)).limit(1);
  return row ? mapPartner(row) : null;
}

export async function getPartnerStoredPinBySlug(slug: string) {
  const [row] = await db
    .select({ id: partners.id, adminPin: partners.adminPin, firmName: partners.firmName })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;
  return { id: row.id, admin_pin: row.adminPin, firm_name: row.firmName };
}

/** @deprecated Use getPartnerStoredPinBySlug */
export async function getPartnerWithPinBySlug(slug: string) {
  return getPartnerStoredPinBySlug(slug);
}

export async function slugExists(slug: string) {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function getTakenSlugs(slugs: string[]) {
  if (slugs.length === 0) return new Set<string>();

  const rows = await db
    .select({ slug: partners.slug })
    .from(partners)
    .where(inArray(partners.slug, slugs));

  return new Set(rows.map((row) => row.slug));
}

export async function createPartner(data: {
  slug: string;
  firmName: string;
  ownerName?: string | null;
  ownerEmail: string;
  tagline?: string | null;
  description?: string | null;
  brandColor?: string;
  secondaryColor?: string;
  paymentProofUrl?: string | null;
  adminPin?: string;
}) {
  const [row] = await db
    .insert(partners)
    .values({
      slug: data.slug,
      firmName: data.firmName,
      ownerName: data.ownerName ?? null,
      ownerEmail: data.ownerEmail,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      brandColor: data.brandColor ?? '#16A34A',
      secondaryColor: data.secondaryColor ?? '#F59E0B',
      paymentProofUrl: data.paymentProofUrl ?? null,
      adminPin: '0000',
      status: 'pending',
    })
    .returning();
  invalidatePartnerIdBySlugCache(data.slug);
  return mapPartner(row);
}

type PartnerUpdateFields = Partial<{
  status: 'pending' | 'active' | 'suspended';
  firmName: string;
  tagline: string | null;
  description: string | null;
  brandColor: string;
  secondaryColor: string;
  monthlyFeePaid: boolean;
  logoUrl: string | null;
  template: 'minimal' | 'bold' | 'dark';
  adminPin: string;
  feeMarkup: string;
}>;

const bodyKeyToColumn: Record<string, keyof PartnerUpdateFields> = {
  status: 'status',
  firm_name: 'firmName',
  tagline: 'tagline',
  description: 'description',
  brand_color: 'brandColor',
  secondary_color: 'secondaryColor',
  monthly_fee_paid: 'monthlyFeePaid',
  logo_url: 'logoUrl',
  template: 'template',
  admin_pin: 'adminPin',
  fee_markup: 'feeMarkup',
};

export async function updatePartnerBySlug(slug: string, body: Record<string, unknown>) {
  const updates: PartnerUpdateFields = {};
  for (const [key, column] of Object.entries(bodyKeyToColumn)) {
    if (key in body) {
      (updates as Record<string, unknown>)[column] = body[key];
    }
  }
  if (Object.keys(updates).length === 0) return null;

  const [row] = await db
    .update(partners)
    .set({ ...updates, updatedAt: sql`NOW()` })
    .where(eq(partners.slug, slug))
    .returning();
  return row ? mapPartner(row) : null;
}

export async function deletePartnerBySlug(slug: string) {
  await db.delete(partners).where(eq(partners.slug, slug));
  invalidatePartnerIdBySlugCache(slug);
}

export async function verifyPartnerPin(slug: string, pin: string) {
  const [row] = await db
    .select({ adminPin: partners.adminPin })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;

  return verifyPartnerAdminPin(row.adminPin, pin);
}

export async function verifyPartnerAdminLogin(slug: string, email: string, pin: string) {
  const [row] = await db
    .select({
      id: partners.id,
      ownerEmail: partners.ownerEmail,
      adminPin: partners.adminPin,
    })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;

  if (!emailsMatch(row.ownerEmail, email)) {
    return false;
  }

  return verifyPartnerAdminPin(row.adminPin, pin);
}

export async function getPartnerForPinReset(slug: string, email: string) {
  const [row] = await db
    .select({
      id: partners.id,
      ownerEmail: partners.ownerEmail,
      firmName: partners.firmName,
    })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;

  if (!emailsMatch(row.ownerEmail, email)) return null;

  return {
    id: row.id,
    firm_name: row.firmName,
    owner_email: row.ownerEmail,
  };
}

export async function setPartnerPinResetOtp(slug: string, otpHash: string, expiresAt: Date) {
  await db
    .update(partners)
    .set({
      adminPinResetOtpHash: otpHash,
      adminPinResetOtpExpiresAt: expiresAt,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.slug, slug));
}

export async function clearPartnerPinResetOtp(slug: string) {
  await db
    .update(partners)
    .set({
      adminPinResetOtpHash: null,
      adminPinResetOtpExpiresAt: null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.slug, slug));
}

export async function getPartnerPinResetOtp(slug: string) {
  const [row] = await db
    .select({
      adminPinResetOtpHash: partners.adminPinResetOtpHash,
      adminPinResetOtpExpiresAt: partners.adminPinResetOtpExpiresAt,
    })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    otp_hash: row.adminPinResetOtpHash,
    otp_expires_at: row.adminPinResetOtpExpiresAt,
  };
}

export async function updatePartnerAdminPin(slug: string, hashedPin: string) {
  await db
    .update(partners)
    .set({
      adminPin: hashedPin,
      adminPinResetOtpHash: null,
      adminPinResetOtpExpiresAt: null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.slug, slug));
}

export async function incrementPartnerTraders(partnerId: number, tx: DbOrTx = db) {
  await tx
    .update(partners)
    .set({
      totalTraders: sql`${partners.totalTraders} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.id, partnerId));
}

export async function recordPartnerLogoGeneration(slug: string, logoUrl: string) {
  const [row] = await db
    .update(partners)
    .set({
      logoGenerationCount: sql`${partners.logoGenerationCount} + 1`,
      lastGeneratedLogoUrl: logoUrl,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(partners.slug, slug),
        sql`${partners.logoGenerationCount} < ${MAX_PARTNER_LOGO_GENERATIONS}`
      )
    )
    .returning({ logoGenerationCount: partners.logoGenerationCount });
  return row ?? null;
}

export async function incrementPartnerRevenue(
  partnerId: number,
  amount: string | number,
  tx: DbOrTx = db
) {
  await tx
    .update(partners)
    .set({
      totalRevenue: sql`${partners.totalRevenue} + ${amount}`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(partners.id, partnerId));
}
