ALTER TABLE "partners" ADD COLUMN "admin_pin_reset_otp_hash" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "admin_pin_reset_otp_expires_at" timestamp;