import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createStoredFilesRepository } from "./stored-files.repository.js";
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

describe("StoredFilesRepository", () => {
  it("creates a file record and reads it back", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const files = createStoredFilesRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Files Tenant",
      planId: plan.id
    });

    const created = await files.create({
      tenantId: tenant.id,
      bucket: "faqchatbot-local",
      objectKey: `${tenant.id}/${randomUUID()}`,
      mimeType: "image/png",
      sizeBytes: 1234
    });

    const found = await files.findById(created.id);

    expect(found?.id).toBe(created.id);
    expect(found?.mimeType).toBe("image/png");
    expect(found?.sizeBytes).toBe(1234);
  });

  it("does not leak files across tenants", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const files = createStoredFilesRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenantA = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant A",
      planId: plan.id
    });
    const tenantB = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant B",
      planId: plan.id
    });

    const fileA = await files.create({
      tenantId: tenantA.id,
      bucket: "faqchatbot-local",
      objectKey: `${tenantA.id}/${randomUUID()}`,
      mimeType: "image/png",
      sizeBytes: 10
    });

    expect(await files.findByIdAndTenantId(fileA.id, tenantB.id)).toBeNull();
    expect((await files.findByIdAndTenantId(fileA.id, tenantA.id))?.id).toBe(fileA.id);

    const forB = await files.listByTenantId(tenantB.id);
    expect(forB).toHaveLength(0);

    const forA = await files.listByTenantId(tenantA.id);
    expect(forA.map((file) => file.id)).toContain(fileA.id);
  });
});
