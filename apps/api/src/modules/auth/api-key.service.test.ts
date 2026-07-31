import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createApiKeysRepository } from "../../db/repositories/api-keys.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { ApiKeyService } from "./api-key.service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;
let apiKeyService: ApiKeyService;

const createTenant = async () => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  return tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
};

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  apiKeyService = new ApiKeyService(db);
});

afterAll(async () => {
  await client.end();
});

describe("ApiKeyService", () => {
  it("returns the raw key only at creation time and never stores it in plain text", async () => {
    const tenant = await createTenant();

    const created = await apiKeyService.create(tenant.id, "CI key");
    const apiKeys = createApiKeysRepository(db);
    const [prefix] = created.rawKey.split(".");
    const stored = await apiKeys.findActiveByPrefix(prefix!);

    expect(stored?.hashedKey).not.toBe(created.rawKey);
    expect(stored?.hashedKey).not.toContain(created.rawKey.split(".")[1]);
  });

  it("verifies a freshly created key", async () => {
    const tenant = await createTenant();
    const created = await apiKeyService.create(tenant.id, "CI key");

    await expect(apiKeyService.verify(created.rawKey)).resolves.toBe(true);
  });

  it("rejects a key with a tampered secret", async () => {
    const tenant = await createTenant();
    const created = await apiKeyService.create(tenant.id, "CI key");
    const [prefix] = created.rawKey.split(".");

    await expect(apiKeyService.verify(`${prefix}.not-the-real-secret`)).resolves.toBe(false);
  });

  it("rejects a malformed key", async () => {
    await expect(apiKeyService.verify("not-a-valid-key-format")).resolves.toBe(false);
  });

  it("rejects a revoked key", async () => {
    const tenant = await createTenant();
    const created = await apiKeyService.create(tenant.id, "CI key");
    const apiKeys = createApiKeysRepository(db);
    const [prefix] = created.rawKey.split(".");
    const stored = await apiKeys.findActiveByPrefix(prefix!);
    await apiKeys.revoke(stored!.id);

    await expect(apiKeyService.verify(created.rawKey)).resolves.toBe(false);
  });
});
