import { eq, sql } from 'drizzle-orm';
import { db } from '../index';
import type { DbOrTx } from '../types';
import { mapPartner, mapPartnerPublic } from '../mappers';
import { partners } from '../schema/partners';

export async function listPartners() {
  const rows = await db.select().from(partners).orderBy(sql`${partners.createdAt} DESC`);
  return rows.map(mapPartner);
}

export async function getPartnerIdBySlug(slug: string) {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

export async function getPartnerBySlug(slug: string) {
  const [row] = await db.select().from(partners).where(eq(partners.slug, slug)).limit(1);
  return row ? mapPartnerPublic(row) : null;
}

export async function getPartnerWithPinBySlug(slug: string) {
  const [row] = await db
    .select({ id: partners.id, adminPin: partners.adminPin, firmName: partners.firmName })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;
  return { id: row.id, admin_pin: row.adminPin, firm_name: row.firmName };
}

export async function slugExists(slug: string) {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  return Boolean(row);
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
      status: 'pending',
    })
    .returning();
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
}

export async function verifyPartnerPin(slug: string, pin: string) {
  const [row] = await db
    .select({ adminPin: partners.adminPin })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!row) return null;
  return row.adminPin === String(pin);
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
