import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createApiKeysRepository } from "./api-keys.repository.js";
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

describe("ApiKeysRepository", () => {
  it("creates, lists and revokes api keys", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const apiKeys = createApiKeysRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });

    const created = await apiKeys.create({
      tenantId: tenant.id,
      name: "Dashboard",
      hashedKey: "salt:hash",
      prefix: "fqc_dash"
    });

    const listed = await apiKeys.listByTenantId(tenant.id);
    const revoked = await apiKeys.revoke(created.id);
    const found = await apiKeys.findById(created.id);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(revoked?.id).toBe(created.id);
    expect(revoked?.revokedAt).toBeInstanceOf(Date);
    expect(found?.id).toBe(created.id);
  });

  it("returns null for an api key that does not exist", async () => {
    const apiKeys = createApiKeysRepository(db);

    await expect(apiKeys.findById(randomUUID())).resolves.toBeNull();
    await expect(apiKeys.revoke(randomUUID())).resolves.toBeNull();
  });
});
