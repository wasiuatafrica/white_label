import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import argon2 from 'argon2';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const PARTNER_LICENSE_FEE = 95_000;
const PARTNER_LICENSE_PERIOD_DAYS = 30;
const PGLITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.pglite');

export const PLACEHOLDER_SLUG = 'render';
export const PLACEHOLDER_FIRM_NAME = 'Renewal Render';
export const PLACEHOLDER_OWNER_NAME = 'Renewal Test Owner';
export const PLACEHOLDER_OWNER_EMAIL = 'dev6.ft9ja@gmail.com';
export const TEST_ADMIN_PIN = '123456';

const USAGE = [
  'Usage: yarn local:partner-renewal',
  '',
  'Creates an active local partner with a paid license period that expired 30 days ago.',
  `Placeholder slug: ${PLACEHOLDER_SLUG}`,
  `Test admin PIN: ${TEST_ADMIN_PIN}`,
].join('\n');

const partnerStatusEnum = pgEnum('partner_status', ['pending', 'active', 'suspended']);
const partnerTemplateEnum = pgEnum('partner_template', ['minimal', 'bold', 'dark']);
const invoiceStatusEnum = pgEnum('partner_license_invoice_status', [
  'pending',
  'receipt_uploaded',
  'overdue',
  'paid',
  'waived',
]);

const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull(),
  firmName: varchar('firm_name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }),
  ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
  brandColor: varchar('brand_color', { length: 7 }).notNull(),
  secondaryColor: varchar('secondary_color', { length: 7 }).notNull(),
  tagline: text('tagline'),
  template: partnerTemplateEnum('template').notNull(),
  status: partnerStatusEnum('status').notNull(),
  adminPin: text('admin_pin').notNull(),
  feeMarkup: numeric('fee_markup', { precision: 10, scale: 2 }).notNull(),
  monthlyFeePaid: boolean('monthly_fee_paid').notNull(),
  setupFeeWaived: boolean('setup_fee_waived').notNull(),
  totalTraders: integer('total_traders').notNull(),
  totalRevenue: numeric('total_revenue', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull(),
});

const partnerLicenseInvoices = pgTable('partner_license_invoices', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').notNull(),
  periodStart: timestamp('period_start', { withTimezone: false }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: false }).notNull(),
  dueAt: timestamp('due_at', { withTimezone: false }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: false }),
  verifiedAmount: numeric('verified_amount', { precision: 12, scale: 2 }),
  verifiedBy: varchar('verified_by', { length: 255 }),
  verificationNote: text('verification_note'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull(),
});

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function buildFixtureDates(now) {
  const periodStart = addDays(now, -2 * PARTNER_LICENSE_PERIOD_DAYS);
  const periodEnd = addDays(now, -PARTNER_LICENSE_PERIOD_DAYS);
  return { periodStart, periodEnd, dueAt: periodStart };
}

function formatUtcDateCompact(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function generateInvoiceNumber(slug, periodStart) {
  return `INV-${slug.toUpperCase()}-${formatUtcDateCompact(periodStart)}`;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function assertLocalSchema(database) {
  await database.select({ id: partners.id }).from(partners).limit(1);
  await database.select({ id: partnerLicenseInvoices.id }).from(partnerLicenseInvoices).limit(1);
}

async function createPartnerRenewalFixture() {
  let client;

  try {
    client = new PGlite(PGLITE_DIR);
    const database = drizzle(client);
    await assertLocalSchema(database);

    const now = new Date();
    const dates = buildFixtureDates(now);
    const invoiceNumber = generateInvoiceNumber(PLACEHOLDER_SLUG, dates.periodStart);
    const adminPinHash = await argon2.hash(TEST_ADMIN_PIN, { type: argon2.argon2id });

    return await database.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, PLACEHOLDER_SLUG))
        .limit(1);

      if (existing) {
        throw new Error(`A local partner already exists for ${PLACEHOLDER_SLUG}.`);
      }

      const [partner] = await tx
        .insert(partners)
        .values({
          slug: PLACEHOLDER_SLUG,
          firmName: PLACEHOLDER_FIRM_NAME,
          ownerName: PLACEHOLDER_OWNER_NAME,
          ownerEmail: PLACEHOLDER_OWNER_EMAIL,
          brandColor: '#16A34A',
          secondaryColor: '#F59E0B',
          tagline: 'Renewal test fixture',
          template: 'minimal',
          status: 'active',
          adminPin: adminPinHash,
          feeMarkup: '0',
          monthlyFeePaid: false,
          setupFeeWaived: false,
          totalTraders: 0,
          totalRevenue: '0',
          createdAt: dates.periodStart,
          updatedAt: now,
        })
        .returning({
          id: partners.id,
          slug: partners.slug,
        });

      if (!partner) {
        throw new Error('The local renewal-test partner could not be created.');
      }

      const [invoice] = await tx
        .insert(partnerLicenseInvoices)
        .values({
          partnerId: partner.id,
          invoiceNumber,
          amount: String(PARTNER_LICENSE_FEE),
          status: 'paid',
          periodStart: dates.periodStart,
          periodEnd: dates.periodEnd,
          dueAt: dates.dueAt,
          paidAt: dates.periodStart,
          verifiedAmount: String(PARTNER_LICENSE_FEE),
          verifiedBy: 'system/test-fixture',
          verificationNote: 'Expired paid license created for renewal testing',
          createdAt: dates.periodStart,
          updatedAt: now,
        })
        .returning({
          id: partnerLicenseInvoices.id,
          invoiceNumber: partnerLicenseInvoices.invoiceNumber,
        });

      if (!invoice) {
        throw new Error('The local renewal-test license invoice could not be created.');
      }

      return { dates, invoice, partner };
    });
  } finally {
    await client?.close();
  }
}

async function runCli() {
  const args = process.argv.slice(2);

  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(USAGE);
    return;
  }

  if (args.length > 0) {
    console.error(`${USAGE}\n\nThis command does not accept arguments.`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await createPartnerRenewalFixture();
    console.log(`Local renewal-test partner created: ${result.partner.slug}`);
    console.log(`Partner admin PIN: ${TEST_ADMIN_PIN}`);
    console.log(`Expired invoice: ${result.invoice.invoiceNumber}`);
    console.log(`Expired period: ${result.dates.periodStart.toISOString()} – ${result.dates.periodEnd.toISOString()}`);
    console.log('Run the partner license cron to create the renewal invoice.');
  } catch (error) {
    const message = getErrorMessage(error);

    if (/relation .* does not exist|does not exist/i.test(message)) {
      console.error(
        'The local PGlite schema is not initialized. Start the app once with `yarn workspace web dev:pglite` or run `yarn db:push:pglite` first.'
      );
    } else {
      console.error(message);
    }

    process.exitCode = 1;
  }
}

const isMainModule =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  await runCli();
}
