import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createAuditLogsRepository } from "./audit-logs.repository.js";
import { createPlansRepository } from "./plans.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";
import { createUsersRepository } from "./users.repository.js";

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

describe("AuditLogsRepository", () => {
  it("creates an audit log entry", async () => {
    const tenant = await createTenant();
    const user = await createUsersRepository(db).create({
      tenantId: tenant.id,
      email: `admin-${randomUUID()}@acme.example.com`,
      passwordHash: "hash"
    });
    const logs = createAuditLogsRepository(db);

    const log = await logs.create({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id
    });

    expect(log.tenantId).toBe(tenant.id);
    expect(log.action).toBe("auth.login");
  });

  it("lists audit logs for a tenant, most recent first, respecting limit and offset", async () => {
    const tenant = await createTenant();
    const logs = createAuditLogsRepository(db);
    const first = await logs.create({
      tenantId: tenant.id,
      action: "tenants.create",
      targetType: "tenant",
      targetId: tenant.id
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await logs.create({
      tenantId: tenant.id,
      action: "tenants.update",
      targetType: "tenant",
      targetId: tenant.id
    });

    const page = await logs.listByTenantId(tenant.id, { limit: 1, offset: 0 });
    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe(second.id);

    const nextPage = await logs.listByTenantId(tenant.id, { limit: 1, offset: 1 });
    expect(nextPage[0]?.id).toBe(first.id);
  });
});
