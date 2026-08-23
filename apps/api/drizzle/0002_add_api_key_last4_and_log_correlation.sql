ALTER TABLE "api_keys" ADD COLUMN "last4" varchar(8) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "correlation_id" varchar(64);