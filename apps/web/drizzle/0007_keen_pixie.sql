ALTER TABLE "partners" ADD COLUMN "logo_generation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "logo_generated_at";