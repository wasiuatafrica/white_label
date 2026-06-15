CREATE TABLE "trade_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"trader_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"evaluation_id" integer NOT NULL,
	"number" integer DEFAULT 0 NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"investor_password" text DEFAULT '' NOT NULL,
	"platform" varchar(255) DEFAULT 'MT5' NOT NULL,
	"typeofaccount" varchar(30) NOT NULL,
	"broker" varchar(255) DEFAULT 'Deriv-Demo' NOT NULL,
	"acc_size" varchar(255) DEFAULT '$10,000' NOT NULL,
	"payout" varchar(255),
	"has_aso" integer,
	"time_to_aso" integer,
	"profit_target" numeric(5, 2),
	"creation_code" varchar(8) NOT NULL,
	"blown" boolean DEFAULT false NOT NULL,
	"inactive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_trader_id_traders_id_fk" FOREIGN KEY ("trader_id") REFERENCES "public"."traders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_evaluation_id_idx" ON "trade_accounts" USING btree ("evaluation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_creation_code_idx" ON "trade_accounts" USING btree ("creation_code");--> statement-breakpoint
CREATE INDEX "trade_accounts_trader_id_idx" ON "trade_accounts" USING btree ("trader_id");--> statement-breakpoint
CREATE INDEX "trade_accounts_partner_id_idx" ON "trade_accounts" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "trade_accounts_number_idx" ON "trade_accounts" USING btree ("number");