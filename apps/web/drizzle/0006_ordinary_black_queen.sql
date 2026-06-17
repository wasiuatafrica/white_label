CREATE TYPE "public"."aso_request_status" AS ENUM('pending', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "aso_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"trader_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"ss_account_id" integer NOT NULL,
	"ss_account_number" integer NOT NULL,
	"status" "aso_request_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar(255),
	"rejection_reason" text,
	"eligibility_profit" numeric(8, 2),
	"eligibility_profit_target" numeric(8, 2),
	"eligibility_checked_at" timestamp,
	"approval_token_hash" varchar(64),
	"approval_token_expires_at" timestamp,
	"approval_token_used_at" timestamp,
	"aso_account_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "trade_accounts_evaluation_id_idx";--> statement-breakpoint
ALTER TABLE "trade_accounts" ALTER COLUMN "evaluation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "logo_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD COLUMN "aso_account_id" integer;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD COLUMN "aso_source_account_id" integer;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD COLUMN "aso_account_number" integer;--> statement-breakpoint
ALTER TABLE "aso_requests" ADD CONSTRAINT "aso_requests_trader_id_traders_id_fk" FOREIGN KEY ("trader_id") REFERENCES "public"."traders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aso_requests" ADD CONSTRAINT "aso_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aso_requests" ADD CONSTRAINT "aso_requests_ss_account_id_trade_accounts_id_fk" FOREIGN KEY ("ss_account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aso_requests" ADD CONSTRAINT "aso_requests_aso_account_id_trade_accounts_id_fk" FOREIGN KEY ("aso_account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aso_requests_open_ss_account_idx" ON "aso_requests" USING btree ("ss_account_id") WHERE "aso_requests"."status" IN ('pending', 'approved');--> statement-breakpoint
CREATE UNIQUE INDEX "aso_requests_completed_ss_account_idx" ON "aso_requests" USING btree ("ss_account_id") WHERE "aso_requests"."status" = 'completed';--> statement-breakpoint
CREATE INDEX "aso_requests_status_requested_idx" ON "aso_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "aso_requests_trader_id_idx" ON "aso_requests" USING btree ("trader_id");--> statement-breakpoint
CREATE INDEX "aso_requests_partner_id_idx" ON "aso_requests" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "aso_requests_token_hash_idx" ON "aso_requests" USING btree ("approval_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_aso_account_id_idx" ON "trade_accounts" USING btree ("aso_account_id") WHERE "trade_accounts"."aso_account_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_aso_source_account_id_idx" ON "trade_accounts" USING btree ("aso_source_account_id") WHERE "trade_accounts"."aso_source_account_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_aso_number_idx" ON "trade_accounts" USING btree ("number") WHERE "trade_accounts"."typeofaccount" = 'Aso';--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_evaluation_id_idx" ON "trade_accounts" USING btree ("evaluation_id") WHERE "trade_accounts"."evaluation_id" IS NOT NULL;