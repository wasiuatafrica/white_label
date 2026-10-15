ALTER TABLE "partners" ADD COLUMN "admin_sessions_revoked_at_ms" bigint;--> statement-breakpoint
ALTER TABLE "traders" ADD COLUMN "sessions_revoked_at_ms" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_payout_requests_one_pending_idx" ON "partner_payout_requests" USING btree ("partner_id") WHERE "partner_payout_requests"."status" = 'pending';