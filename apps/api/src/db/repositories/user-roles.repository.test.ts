import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createRolesRepository } from "./roles.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";
import { createUsersRepository } from "./users.repository.js";
import { createUserRolesRepository } from "./user-roles.repository.js";

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

describe("UserRolesRepository", () => {
  it("assigns, lists and removes roles for a user", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const users = createUsersRepository(db);
    const roles = createRolesRepository(db);
    const userRoles = createUserRolesRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });
    const role = await roles.create({
      tenantId: tenant.id,
      slug: `role-${randomUUID()}`,
      name: "Role"
    });
    const user = await users.create({
      tenantId: tenant.id,
      email: `admin-${randomUUID()}@example.com`,
      passwordHash: "salt:hash"
    });

    await expect(userRoles.assignRole(user.id, role.id)).resolves.not.toBeNull();
    await expect(userRoles.listRoleSlugsByUserId(user.id)).resolves.toEqual([{ slug: role.slug }]);

    await userRoles.removeRolesByUserId(user.id);

    await expect(userRoles.listRoleSlugsByUserId(user.id)).resolves.toEqual([]);
  });
});
