ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "logo_generation_count" integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "partners" SET "logo_generation_count" = 1 WHERE "logo_generated_at" IS NOT NULL AND "logo_generation_count" < 1;--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN IF EXISTS "logo_generated_at";
