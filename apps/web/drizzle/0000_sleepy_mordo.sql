CREATE TYPE "public"."eval_status" AS ENUM('pending_payment', 'active', 'passed', 'failed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."eval_type" AS ENUM('SS', 'SSL');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."partner_payout_request_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."partner_template" AS ENUM('minimal', 'bold', 'dark');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('processing', 'paid');--> statement-breakpoint
CREATE TYPE "public"."trader_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."trader_request_type" AS ENUM('talent_bonus', 'aso_payout_ssl', 'aso_account');--> statement-breakpoint
CREATE TYPE "public"."trader_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"firm_name" varchar(255) NOT NULL,
	"owner_name" varchar(255),
	"owner_email" varchar(255) NOT NULL,
	"logo_url" text,
	"brand_color" varchar(7) DEFAULT '#16A34A' NOT NULL,
	"secondary_color" varchar(7) DEFAULT '#F59E0B' NOT NULL,
	"tagline" text DEFAULT 'Trade smarter...',
	"description" text,
	"template" "partner_template" DEFAULT 'minimal' NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"admin_pin" varchar(20) DEFAULT '0000' NOT NULL,
	"fee_markup" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monthly_fee_paid" boolean DEFAULT false NOT NULL,
	"setup_fee_waived" boolean DEFAULT false NOT NULL,
	"total_traders" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_proof_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traders" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"status" "trader_status" DEFAULT 'active' NOT NULL,
	"reset_token" text,
	"reset_token_expires" timestamp,
	"kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"kyc_full_name" text,
	"kyc_id_type" varchar(50),
	"kyc_id_number" varchar(100),
	"kyc_id_url" text,
	"kyc_address" text,
	"kyc_selfie_url" text,
	"kyc_submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"trader_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"eval_type" "eval_type" NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "eval_status" DEFAULT 'pending_payment' NOT NULL,
	"profit_target" numeric(5, 2) DEFAULT '10.0' NOT NULL,
	"current_profit" numeric(5, 2) DEFAULT '0' NOT NULL,
	"max_drawdown" numeric(5, 2) DEFAULT '10.0' NOT NULL,
	"current_drawdown" numeric(5, 2) DEFAULT '0' NOT NULL,
	"trading_days" integer DEFAULT 0 NOT NULL,
	"required_days" integer DEFAULT 30 NOT NULL,
	"payout_status" "payout_status",
	"purchase_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trader_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"trader_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"eval_id" integer NOT NULL,
	"request_type" "trader_request_type" NOT NULL,
	"notes" text,
	"admin_notes" text,
	"status" "trader_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_payout_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"amount_requested" numeric(14, 2) NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"notes" text,
	"status" "partner_payout_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traders" ADD CONSTRAINT "traders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_trader_id_traders_id_fk" FOREIGN KEY ("trader_id") REFERENCES "public"."traders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trader_requests" ADD CONSTRAINT "trader_requests_trader_id_traders_id_fk" FOREIGN KEY ("trader_id") REFERENCES "public"."traders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trader_requests" ADD CONSTRAINT "trader_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trader_requests" ADD CONSTRAINT "trader_requests_eval_id_evaluations_id_fk" FOREIGN KEY ("eval_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payout_requests" ADD CONSTRAINT "partner_payout_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partners_slug_idx" ON "partners" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "traders_partner_email_idx" ON "traders" USING btree ("partner_id","email");--> statement-breakpoint
CREATE INDEX "evaluations_partner_id_idx" ON "evaluations" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "evaluations_trader_id_idx" ON "evaluations" USING btree ("trader_id");--> statement-breakpoint
CREATE INDEX "evaluations_status_idx" ON "evaluations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "evaluations_payout_status_idx" ON "evaluations" USING btree ("payout_status");--> statement-breakpoint
CREATE INDEX "trader_requests_eval_type_status_idx" ON "trader_requests" USING btree ("eval_id","request_type","status");--> statement-breakpoint
CREATE INDEX "trader_requests_trader_id_idx" ON "trader_requests" USING btree ("trader_id");--> statement-breakpoint
CREATE INDEX "trader_requests_partner_id_idx" ON "trader_requests" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_payout_requests_partner_status_idx" ON "partner_payout_requests" USING btree ("partner_id","status");