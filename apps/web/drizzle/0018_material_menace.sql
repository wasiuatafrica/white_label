ALTER TYPE "public"."partner_license_invoice_status" ADD VALUE 'not_paid';--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "license_intro_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "license_intro_ends_at" timestamp;