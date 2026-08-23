import { createDatabase } from "./client.js";
import { hashPassword } from "../auth/password.js";
import { createPermissionsRepository } from "./repositories/permissions.repository.js";
import { createPlansRepository } from "./repositories/plans.repository.js";
import { createRolesRepository } from "./repositories/roles.repository.js";
import { createRolePermissionsRepository } from "./repositories/role-permissions.repository.js";
import { createTenantsRepository } from "./repositories/tenants.repository.js";
import { createUserRolesRepository } from "./repositories/user-roles.repository.js";
import { createUsersRepository } from "./repositories/users.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed");
}

const { db, client } = createDatabase(databaseUrl);

const plans = createPlansRepository(db);
const tenants = createTenantsRepository(db);
const users = createUsersRepository(db);
const permissionsRepo = createPermissionsRepository(db);
const rolesRepo = createRolesRepository(db);
const rolePermissions = createRolePermissionsRepository(db);
const userRoles = createUserRolesRepository(db);

const plan =
  (await plans.findBySlug("starter")) ??
  (await plans.create({
    slug: "starter",
    name: "Starter",
    limits: { messagesPerMinute: 30, conversationsPerDay: 200 }
  }));

const tenant =
  (await tenants.findByPublicId("demo")) ??
  (await tenants.create({ publicId: "demo", name: "Demo Tenant", planId: plan.id }));

const adminEmail = "admin@faqchatbot.local";
const admin =
  (await users.findByEmail(adminEmail)) ??
  (await users.create({
    tenantId: tenant.id,
    email: adminEmail,
    passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "change-me-now")
  }));

const PERMISSION_SLUGS = ["tenants:read", "tenants:write"] as const;
const permissionIds: string[] = [];

for (const slug of PERMISSION_SLUGS) {
  const existing = await permissionsRepo.findBySlug(slug);
  permissionIds.push(existing?.id ?? (await permissionsRepo.create({ slug, description: `Seeded ${slug}` })).id);
}

const platformAdminRole =
  (await rolesRepo.findBySlugForTenant(tenant.id, "platform_admin")) ??
  (await rolesRepo.create({ tenantId: tenant.id, slug: "platform_admin", name: "Platform Admin" }));

for (const permissionId of permissionIds) {
  await rolePermissions.assign(platformAdminRole.id, permissionId).catch(() => undefined);
}

const adminRoleSlugs = await userRoles.listRoleSlugsByUserId(admin.id);
if (!adminRoleSlugs.includes("platform_admin")) {
  await userRoles.assign(admin.id, platformAdminRole.id);
}

process.stdout.write(
  `${JSON.stringify(
    {
      plan: plan.slug,
      tenant: tenant.publicId,
      admin: admin.email,
      roles: await userRoles.listRoleSlugsByUserId(admin.id)
    },
    null,
    2,
  )}\n`,
);

await client.end();
