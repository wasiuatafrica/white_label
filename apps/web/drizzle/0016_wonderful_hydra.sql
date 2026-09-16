CREATE TYPE "public"."partner_license_invoice_status" AS ENUM('pending', 'receipt_uploaded', 'overdue', 'paid', 'waived');--> statement-breakpoint
CREATE TABLE "partner_license_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"amount" numeric(12, 2) DEFAULT '95000' NOT NULL,
	"status" "partner_license_invoice_status" DEFAULT 'pending' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"due_at" timestamp NOT NULL,
	"payment_proof_url" text,
	"receipt_uploaded_at" timestamp,
	"paid_at" timestamp,
	"verified_amount" numeric(12, 2),
	"verified_by" varchar(255),
	"verification_note" text,
	"invoice_email_sent_at" timestamp,
	"overdue_email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_license_invoices" ADD CONSTRAINT "partner_license_invoices_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_license_invoices_partner_period_start_idx" ON "partner_license_invoices" USING btree ("partner_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_license_invoices_invoice_number_idx" ON "partner_license_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "partner_license_invoices_partner_id_idx" ON "partner_license_invoices" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_license_invoices_status_idx" ON "partner_license_invoices" USING btree ("status");