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
      name: "Starter",
    });

    const publicId = `tenant-${randomUUID()}`;
    const tenant = await tenants.create({
      publicId,
      name: "Acme Inc",
      planId: plan.id,
    });

    const found = await tenants.findByPublicId(publicId);

    expect(found?.id).toBe(tenant.id);
    expect(found?.status).toBe("active");
  }, 10_000);

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
      planId: plan.id,
    });
    const tenantB = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant B",
      planId: plan.id,
    });

    await domains.create({ tenantId: tenantA.id, domain: "a.example.com" });
    await domains.create({ tenantId: tenantB.id, domain: "b.example.com" });

    const domainsForA = await domains.listByTenantId(tenantA.id);

    expect(domainsForA).toHaveLength(1);
    expect(domainsForA[0]?.domain).toBe("a.example.com");
  });

  it("finds a tenant domain by domain", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const domains = createTenantDomainsRepository(db);
    const domainName = `docs-${randomUUID()}.example.com`;

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant A",
      planId: plan.id,
    });

    await domains.create({ tenantId: tenant.id, domain: domainName });

    const found = await domains.findByDomain(domainName);

    expect(found?.tenantId).toBe(tenant.id);
    expect(found?.domain).toBe(domainName);
  });

  it("deletes a tenant domain by id", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const domains = createTenantDomainsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant A",
      planId: plan.id,
    });

    const created = await domains.create({ tenantId: tenant.id, domain: "remove.example.com" });
    const deleted = await domains.delete(created.id);
    const remaining = await domains.listByTenantId(tenant.id);

    expect(deleted?.id).toBe(created.id);
    expect(deleted?.tenantId).toBe(tenant.id);
    expect(remaining).toHaveLength(0);
  });
});
