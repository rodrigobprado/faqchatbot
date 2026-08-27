ALTER TABLE "tenant_domains" ADD COLUMN "verification_token" varchar(64);--> statement-breakpoint
UPDATE "tenant_domains" SET "verification_token" = md5(random()::text || clock_timestamp()::text) || md5(random()::text || id::text) WHERE "verification_token" IS NULL;--> statement-breakpoint
ALTER TABLE "tenant_domains" ALTER COLUMN "verification_token" SET NOT NULL;--> statement-breakpoint
UPDATE "tenant_domains" SET "is_verified" = true WHERE "is_verified" = false;