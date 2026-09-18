DROP INDEX "traders_partner_email_idx";--> statement-breakpoint
UPDATE "partners" SET "owner_email" = lower("owner_email");--> statement-breakpoint
UPDATE "traders" SET "email" = lower("email");--> statement-breakpoint
CREATE UNIQUE INDEX "partners_owner_email_idx" ON "partners" USING btree ("owner_email");--> statement-breakpoint
CREATE UNIQUE INDEX "traders_email_idx" ON "traders" USING btree ("email");