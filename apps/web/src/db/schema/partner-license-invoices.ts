import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { partnerLicenseInvoiceStatusEnum } from './enums';
import { partners } from './partners';

export const partnerLicenseInvoices = pgTable(
  'partner_license_invoices',
  {
    id: serial('id').primaryKey(),
    partnerId: integer('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('95000'),
    status: partnerLicenseInvoiceStatusEnum('status').notNull().default('pending'),
    periodStart: timestamp('period_start', { withTimezone: false }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: false }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: false }).notNull(),
    paymentProofUrl: text('payment_proof_url'),
    receiptUploadedAt: timestamp('receipt_uploaded_at', { withTimezone: false }),
    paidAt: timestamp('paid_at', { withTimezone: false }),
    verifiedAmount: numeric('verified_amount', { precision: 12, scale: 2 }),
    verifiedBy: varchar('verified_by', { length: 255 }),
    verificationNote: text('verification_note'),
    invoiceEmailSentAt: timestamp('invoice_email_sent_at', { withTimezone: false }),
    overdueEmailSentAt: timestamp('overdue_email_sent_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('partner_license_invoices_partner_period_start_idx').on(
      table.partnerId,
      table.periodStart
    ),
    uniqueIndex('partner_license_invoices_invoice_number_idx').on(table.invoiceNumber),
    index('partner_license_invoices_partner_id_idx').on(table.partnerId),
    index('partner_license_invoices_status_idx').on(table.status),
  ]
);

export const partnerLicenseInvoicesRelations = relations(partnerLicenseInvoices, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerLicenseInvoices.partnerId],
    references: [partners.id],
  }),
}));

export type PartnerLicenseInvoice = typeof partnerLicenseInvoices.$inferSelect;
export type NewPartnerLicenseInvoice = typeof partnerLicenseInvoices.$inferInsert;
