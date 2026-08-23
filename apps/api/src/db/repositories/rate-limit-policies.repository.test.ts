import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createRateLimitPoliciesRepository } from "./rate-limit-policies.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";

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

const createTenant = async () => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  return tenants.create({ publicId: `tenant-${randomUUID()}`, name: "Acme Inc", planId: plan.id });
};

describe("RateLimitPoliciesRepository", () => {
  it("creates a policy for a tenant and scope", async () => {
    const tenant = await createTenant();
    const policies = createRateLimitPoliciesRepository(db);

    const policy = await policies.upsert({ tenantId: tenant.id, scope: "tenant", limit: 100, windowSeconds: 60 });

    expect(policy.limit).toBe(100);
    expect(policy.windowSeconds).toBe(60);
  });

  it("finds the policy for a tenant and scope", async () => {
    const tenant = await createTenant();
    const policies = createRateLimitPoliciesRepository(db);
    await policies.upsert({ tenantId: tenant.id, scope: "visitor", limit: 30, windowSeconds: 60 });

    const found = await policies.findByTenantAndScope(tenant.id, "visitor");

    expect(found?.limit).toBe(30);
  });

  it("returns null when no policy is configured for the scope", async () => {
    const tenant = await createTenant();
    const policies = createRateLimitPoliciesRepository(db);

    const found = await policies.findByTenantAndScope(tenant.id, "conversation");

    expect(found).toBeNull();
  });

  it("updates an existing policy instead of duplicating it", async () => {
    const tenant = await createTenant();
    const policies = createRateLimitPoliciesRepository(db);
    await policies.upsert({ tenantId: tenant.id, scope: "tenant", limit: 100, windowSeconds: 60 });

    const updated = await policies.upsert({ tenantId: tenant.id, scope: "tenant", limit: 200, windowSeconds: 60 });

    expect(updated.limit).toBe(200);
    const found = await policies.findByTenantAndScope(tenant.id, "tenant");
    expect(found?.limit).toBe(200);
  });
});
