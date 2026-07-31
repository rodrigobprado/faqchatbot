import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Redis } from "ioredis";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { analyticsEvents } from "../../db/schema.js";
import { AnalyticsService } from "../analytics/analytics.service.js";
import { RateLimiterService } from "./rate-limiter.service.js";
import { RateLimitExceededException } from "./rate-limit-exceeded.exception.js";
import { RateLimitService } from "./rate-limit.service.js";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) {
  throw new Error("DATABASE_URL and REDIS_URL are required to run rate limit integration tests");
}

let db: Database;
let client: Sql;
let redis: Redis;
let rateLimit: RateLimitService;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  redis = new Redis(redisUrl);
  rateLimit = new RateLimitService(new RateLimiterService(redis), db, new AnalyticsService(db));
});

afterAll(async () => {
  await client.end();
  await redis.quit();
});

const createTenant = async (limits?: Record<string, unknown>) => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter", limits });
  return tenants.create({ publicId: `tenant-${randomUUID()}`, name: "Acme Inc", planId: plan.id });
};

describe("RateLimitService.enforce", () => {
  it("allows requests within the platform default for an anonymous IP", async () => {
    await expect(rateLimit.enforce("ip", randomUUID(), null)).resolves.toBeUndefined();
  });

  it("throws RateLimitExceededException once the tenant's plan limit is exceeded", async () => {
    const tenant = await createTenant({ messagesPerMinute: 1 });
    const key = randomUUID();

    await rateLimit.enforce("visitor", key, tenant.id);

    await expect(rateLimit.enforce("visitor", key, tenant.id)).rejects.toBeInstanceOf(RateLimitExceededException);
  });

  it("records a RateLimitExceeded analytics event when a tenant-scoped limit is exceeded", async () => {
    const tenant = await createTenant({ messagesPerMinute: 1 });
    const key = randomUUID();
    await rateLimit.enforce("conversation", key, tenant.id);

    await expect(rateLimit.enforce("conversation", key, tenant.id)).rejects.toBeInstanceOf(
      RateLimitExceededException,
    );

    await vi.waitFor(async () => {
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.tenantId, tenant.id), eq(analyticsEvents.eventType, "RateLimitExceeded")));

      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({ type: "RateLimitExceeded", scope: "conversation" });
    });
  });
});
