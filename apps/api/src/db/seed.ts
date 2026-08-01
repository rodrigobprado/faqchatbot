import { createDatabase } from "./client.js";
import { createPlansRepository } from "./repositories/plans.repository.js";
import { createRolesRepository } from "./repositories/roles.repository.js";
import { createTenantDomainsRepository } from "./repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "./repositories/tenants.repository.js";
import { createUserRolesRepository } from "./repositories/user-roles.repository.js";
import { createUsersRepository } from "./repositories/users.repository.js";
import { hashPassword } from "../auth/password.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed");
}

const branch = process.env.APP_BRANCH ?? "main";
const tenantPublicId = process.env.SEED_TENANT_PUBLIC_ID ?? `demo-${branch}`;
const tenantName = process.env.SEED_TENANT_NAME ?? `Demo Tenant ${branch}`;
const tenantDomain = process.env.SEED_TENANT_DOMAIN ?? "localhost";
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? `admin+${branch}@faqchatbot.local`;
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";

const { db, client } = createDatabase(databaseUrl);

const plans = createPlansRepository(db);
const tenants = createTenantsRepository(db);
const tenantDomains = createTenantDomainsRepository(db);
const users = createUsersRepository(db);
const roles = createRolesRepository(db);
const userRoles = createUserRolesRepository(db);

const plan =
  (await plans.findBySlug("starter")) ??
  (await plans.create({
    slug: "starter",
    name: "Starter",
    limits: { messagesPerMinute: 30, conversationsPerDay: 200 }
  }));

const tenant =
  (await tenants.findByPublicId(tenantPublicId)) ??
  (await tenants.create({ publicId: tenantPublicId, name: tenantName, planId: plan.id }));

const existingDomains = await tenantDomains.listByTenantId(tenant.id);
if (!existingDomains.some((domain) => domain.domain === tenantDomain)) {
  await tenantDomains.create({ tenantId: tenant.id, domain: tenantDomain });
}

const admin =
  (await users.findByEmail(adminEmail)) ??
  (await users.create({
    tenantId: tenant.id,
    email: adminEmail,
    passwordHash: hashPassword(adminPassword)
  }));

const adminRole =
  (await roles.findByTenantIdAndSlug(tenant.id, "admin")) ??
  (await roles.create({
    tenantId: tenant.id,
    slug: "admin",
    name: "Administrator"
  }));

const platformAdminRole =
  (await roles.findByTenantIdAndSlug(null, "platform_admin")) ??
  (await roles.create({
    slug: "platform_admin",
    name: "Platform Administrator"
  }));

await userRoles.assignRole(admin.id, adminRole.id);
await userRoles.assignRole(admin.id, platformAdminRole.id);

process.stdout.write(
  `${JSON.stringify(
    {
      branch,
      plan: plan.slug,
      tenant: tenant.publicId,
      admin: admin.email
    },
    null,
    2,
  )}\n`,
);

await client.end();
