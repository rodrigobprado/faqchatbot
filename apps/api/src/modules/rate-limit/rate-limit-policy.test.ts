import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createRateLimitPoliciesRepository } from "../../db/repositories/rate-limit-policies.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { PLATFORM_DEFAULT_RATE_LIMITS, resolveRateLimitPolicy } from "./rate-limit-policy.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
});

afterAll(async () => {
  await client.end();
});

const createTenant = async (limits?: Record<string, unknown>) => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter", limits });
  return tenants.create({ publicId: `tenant-${randomUUID()}`, name: "Acme Inc", planId: plan.id });
};

describe("resolveRateLimitPolicy", () => {
  it("falls back to the platform default when there is no tenant", async () => {
    const policy = await resolveRateLimitPolicy(db, "ip", null);

    expect(policy).toEqual(PLATFORM_DEFAULT_RATE_LIMITS.ip);
  });

  it("falls back to the platform default when the tenant has no override or plan limit", async () => {
    const tenant = await createTenant();

    const policy = await resolveRateLimitPolicy(db, "tenant", tenant.id);

    expect(policy).toEqual(PLATFORM_DEFAULT_RATE_LIMITS.tenant);
  });

  it("uses the plan messagesPerMinute limit for visitor and conversation scopes", async () => {
    const tenant = await createTenant({ messagesPerMinute: 7 });

    const policy = await resolveRateLimitPolicy(db, "visitor", tenant.id);

    expect(policy).toEqual({ limit: 7, windowSeconds: 60 });
  });

  it("prefers an explicit tenant policy override over the plan limit", async () => {
    const tenant = await createTenant({ messagesPerMinute: 7 });
    await createRateLimitPoliciesRepository(db).upsert({
      tenantId: tenant.id,
      scope: "visitor",
      limit: 3,
      windowSeconds: 30
    });

    const policy = await resolveRateLimitPolicy(db, "visitor", tenant.id);

    expect(policy).toEqual({ limit: 3, windowSeconds: 30 });
  });
});
