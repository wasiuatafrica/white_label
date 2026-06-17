CREATE TABLE "partner_signup_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'started' NOT NULL,
	"last_step" varchar(32) DEFAULT 'details' NOT NULL,
	"firm_name" varchar(255),
	"slug" varchar(100),
	"owner_name" varchar(255),
	"owner_email" varchar(255),
	"payment_method" varchar(32),
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"abandoned_at" timestamp,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "partner_signup_events_attempt_id_idx" ON "partner_signup_events" USING btree ("attempt_id");