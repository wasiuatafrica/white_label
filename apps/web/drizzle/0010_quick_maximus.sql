ALTER TABLE "partners" ADD COLUMN "last_generated_logo_url" text;--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "verified_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "markup_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "wholesale_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "partner_earnings_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "verification_note" text;--> statement-breakpoint
ALTER TABLE "partner_payout_requests" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "partner_payout_requests" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_payout_requests" ADD COLUMN "processed_at" timestamp;