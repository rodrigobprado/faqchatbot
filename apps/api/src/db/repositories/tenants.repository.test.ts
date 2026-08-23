import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createTenantDomainsRepository } from "./tenant-domains.repository.js";
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

describe("TenantsRepository", () => {
  it("creates a tenant tied to a plan and reads it back by publicId", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);

    const plan = await plans.create({
      slug: `plan-${randomUUID()}`,
      name: "Starter"
    });

    const publicId = `tenant-${randomUUID()}`;
    const tenant = await tenants.create({
      publicId,
      name: "Acme Inc",
      planId: plan.id
    });

    const found = await tenants.findByPublicId(publicId);

    expect(found?.id).toBe(tenant.id);
    expect(found?.status).toBe("active");
  });

  it("returns null for a publicId that does not exist", async () => {
    const tenants = createTenantsRepository(db);

    const found = await tenants.findByPublicId(`missing-${randomUUID()}`);

    expect(found).toBeNull();
  });

  it("does not leak tenant-scoped rows across tenants", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const domains = createTenantDomainsRepository(db);

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

    await domains.create({ tenantId: tenantA.id, domain: "a.example.com" });
    await domains.create({ tenantId: tenantB.id, domain: "b.example.com" });

    const domainsForA = await domains.listByTenantId(tenantA.id);

    expect(domainsForA).toHaveLength(1);
    expect(domainsForA[0]?.domain).toBe("a.example.com");
  });

  it("updates tenant fields and excludes soft-deleted tenants from list", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Original Name",
      planId: plan.id
    });

    const updated = await tenants.update(tenant.id, { name: "Renamed", status: "suspended" });
    expect(updated?.name).toBe("Renamed");
    expect(updated?.status).toBe("suspended");

    const listedBeforeDelete = await tenants.list();
    expect(listedBeforeDelete.some((t) => t.id === tenant.id)).toBe(true);

    const deleted = await tenants.softDelete(tenant.id);
    expect(deleted?.deletedAt).not.toBeNull();

    const listedAfterDelete = await tenants.list();
    expect(listedAfterDelete.some((t) => t.id === tenant.id)).toBe(false);
  });

  it("removes a tenant domain", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const domains = createTenantDomainsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });
    const domain = await domains.create({ tenantId: tenant.id, domain: "remove-me.example.com" });

    await domains.remove(domain.id);

    const remaining = await domains.listByTenantId(tenant.id);
    expect(remaining).toHaveLength(0);
  });
});
