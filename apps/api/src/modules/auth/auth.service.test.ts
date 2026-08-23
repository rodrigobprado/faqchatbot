import { randomUUID } from "node:crypto";
import { parseEnvironment } from "@faqchatbot/config";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../../auth/password.js";
import { createDatabase, type Database } from "../../db/client.js";
import { createPermissionsRepository } from "../../db/repositories/permissions.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createRolePermissionsRepository } from "../../db/repositories/role-permissions.repository.js";
import { createRolesRepository } from "../../db/repositories/roles.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createUserRolesRepository } from "../../db/repositories/user-roles.repository.js";
import { createUsersRepository } from "../../db/repositories/users.repository.js";
import { AuthService } from "./auth.service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;
let authService: AuthService;

const createLoggedInFixture = async (password: string) => {
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
  const email = `admin-${randomUUID()}@example.com`;
  const user = await users.create({
    tenantId: tenant.id,
    email,
    passwordHash: await hashPassword(password)
  });
  const role = await roles.create({ tenantId: tenant.id, slug: "admin", name: "Admin" });
  const permission = await permissions.create({ slug: `tenants:write-${randomUUID()}` });
  await rolePermissions.assign(role.id, permission.id);
  await userRoles.assign(user.id, role.id);

  return { email, user, tenant };
};

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  authService = new AuthService(db, parseEnvironment(process.env), new JwtService());
});

afterAll(async () => {
  await client.end();
});

describe("AuthService.login", () => {
  it("issues an access token with the granted roles and permissions", async () => {
    const password = "correct horse battery staple";
    const { email, user } = await createLoggedInFixture(password);

    const result = await authService.login(email, password);

    expect(result.user).toEqual({ id: user.id, email, tenantId: user.tenantId, roles: ["admin"] });
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(result.accessToken).not.toBe(result.refreshToken);
  });

  it("rejects a wrong password", async () => {
    const { email } = await createLoggedInFixture("correct horse battery staple");

    await expect(authService.login(email, "wrong password")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unknown email", async () => {
    await expect(
      authService.login(`missing-${randomUUID()}@example.com`, "correct horse battery staple"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.refresh", () => {
  it("issues a new access token from a valid refresh token", async () => {
    const password = "correct horse battery staple";
    const { email } = await createLoggedInFixture(password);
    const { refreshToken } = await authService.login(email, password);

    const result = await authService.refresh(refreshToken);

    expect(result.accessToken).toBeTruthy();
    expect(result.expiresInSeconds).toBeGreaterThan(0);
  });

  it("rejects a malformed refresh token", async () => {
    await expect(authService.refresh("not-a-jwt")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an access token presented as a refresh token", async () => {
    const password = "correct horse battery staple";
    const { email } = await createLoggedInFixture(password);
    const { accessToken } = await authService.login(email, password);

    await expect(authService.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
