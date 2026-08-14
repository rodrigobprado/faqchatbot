import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
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

describe("UsersRepository", () => {
  it("creates a user tied to a tenant and reads it back by email", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const users = createUsersRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });

    const email = `admin-${randomUUID()}@example.com`;
    const user = await users.create({
      tenantId: tenant.id,
      email,
      passwordHash: "salt:derivedkey"
    });

    const found = await users.findByEmail(email);

    expect(found?.id).toBe(user.id);
    expect(found?.tenantId).toBe(tenant.id);
  });

  it("returns null for an email that does not exist", async () => {
    const users = createUsersRepository(db);

    const found = await users.findByEmail(`missing-${randomUUID()}@example.com`);

    expect(found).toBeNull();
  });

  it("lists users by tenant and updates their status", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const users = createUsersRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });

    const user = await users.create({
      tenantId: tenant.id,
      email: `invite-${randomUUID()}@example.com`,
      passwordHash: "salt:hash",
      status: "invited"
    });

    const listed = await users.listByTenantId(tenant.id);
    const updated = await users.updateStatus(user.id, "active");

    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe("invited");
    expect(updated?.status).toBe("active");
  });
});
