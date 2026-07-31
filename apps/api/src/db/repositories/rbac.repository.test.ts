import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createApiKeysRepository } from "./api-keys.repository.js";
import { createAuditLogsRepository } from "./audit-logs.repository.js";
import { createPermissionsRepository } from "./permissions.repository.js";
import { createPlansRepository } from "./plans.repository.js";
import { createRolePermissionsRepository } from "./role-permissions.repository.js";
import { createRolesRepository } from "./roles.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";
import { createUserRolesRepository } from "./user-roles.repository.js";
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

describe("RBAC repositories", () => {
  it("resolves the role and permission slugs granted to a user", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const users = createUsersRepository(db);
    const roles = createRolesRepository(db);
    const permissions = createPermissionsRepository(db);
    const rolePermissions = createRolePermissionsRepository(db);
    const userRoles = createUserRolesRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const user = await users.create({
      tenantId: tenant.id,
      email: `admin-${randomUUID()}@example.com`,
      passwordHash: "irrelevant-for-this-test"
    });
    const role = await roles.create({ tenantId: tenant.id, slug: "admin", name: "Admin" });
    const permissionSlug = `tenants:write-${randomUUID()}`;
    const permission = await permissions.create({ slug: permissionSlug });

    await rolePermissions.assign(role.id, permission.id);
    await userRoles.assign(user.id, role.id);

    const grantedRoleSlugs = await userRoles.listRoleSlugsByUserId(user.id);
    const grantedPermissionSlugs = await rolePermissions.listPermissionSlugsByRoleId(role.id);

    expect(grantedRoleSlugs).toEqual(["admin"]);
    expect(grantedPermissionSlugs).toEqual([permissionSlug]);
  });
});

describe("RolesRepository.listByTenantId and findBySlugForTenant", () => {
  it("lists roles scoped to a tenant and finds one by slug", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const roles = createRolesRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const role = await roles.create({ tenantId: tenant.id, slug: `admin-${randomUUID()}`, name: "Admin" });

    const list = await roles.listByTenantId(tenant.id);
    expect(list.some((row) => row.id === role.id)).toBe(true);

    const found = await roles.findBySlugForTenant(tenant.id, role.slug);
    expect(found?.id).toBe(role.id);

    const notFound = await roles.findBySlugForTenant(tenant.id, `missing-${randomUUID()}`);
    expect(notFound).toBeNull();
  });
});

describe("PermissionsRepository.list", () => {
  it("returns every permission", async () => {
    const permissions = createPermissionsRepository(db);
    const slug = `custom:${randomUUID()}`;
    const permission = await permissions.create({ slug });

    const all = await permissions.list();

    expect(all.some((row) => row.id === permission.id)).toBe(true);
  });
});

describe("ApiKeysRepository", () => {
  it("creates a key, finds it while active and stops matching once revoked", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const apiKeys = createApiKeysRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });

    const prefix = randomUUID().slice(0, 8);
    const created = await apiKeys.create({
      tenantId: tenant.id,
      name: "CI key",
      hashedKey: "hashed-value",
      prefix
    });

    const found = await apiKeys.findActiveByPrefix(prefix);
    expect(found?.id).toBe(created.id);

    const revoked = await apiKeys.revoke(created.id);
    expect(revoked?.revokedAt).not.toBeNull();

    const foundAfterRevoke = await apiKeys.findActiveByPrefix(prefix);
    expect(foundAfterRevoke).toBeNull();
  });
});

describe("AuditLogsRepository", () => {
  it("persists an audit entry for a sensitive action", async () => {
    const auditLogs = createAuditLogsRepository(db);

    const log = await auditLogs.create({
      action: "user.login",
      targetType: "user",
      targetId: randomUUID()
    });

    expect(log.action).toBe("user.login");
    expect(log.metadata).toEqual({});
  });
});
