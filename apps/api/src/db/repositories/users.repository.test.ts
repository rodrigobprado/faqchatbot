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

  it("finds a user by id", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const users = createUsersRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });
    const created = await users.create({
      tenantId: tenant.id,
      email: `admin-${randomUUID()}@example.com`,
      passwordHash: "salt:derivedkey"
    });

    const found = await users.findById(created.id);

    expect(found?.email).toBe(created.email);
  });

  it("returns null for an id that does not exist", async () => {
    const users = createUsersRepository(db);

    const found = await users.findById(randomUUID());

    expect(found).toBeNull();
  });

  it("lists users for a tenant", async () => {
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
      email: `admin-${randomUUID()}@example.com`,
      passwordHash: "salt:derivedkey"
    });

    const list = await users.listByTenantId(tenant.id);

    expect(list.some((row) => row.id === user.id)).toBe(true);
  });
});
