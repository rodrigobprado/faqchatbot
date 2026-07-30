import { randomBytes, scryptSync } from "node:crypto";
import { createDatabase } from "./client.js";
import { createPlansRepository } from "./repositories/plans.repository.js";
import { createTenantsRepository } from "./repositories/tenants.repository.js";
import { createUsersRepository } from "./repositories/users.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed");
}

// ponytail: scrypt placeholder for the seed only; Fase 4 (auth) replaces this with Argon2.
const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
};

const { db, client } = createDatabase(databaseUrl);

const plans = createPlansRepository(db);
const tenants = createTenantsRepository(db);
const users = createUsersRepository(db);

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
    passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "change-me-now")
  }));

process.stdout.write(
  `${JSON.stringify({ plan: plan.slug, tenant: tenant.publicId, admin: admin.email }, null, 2)}\n`,
);

await client.end();
