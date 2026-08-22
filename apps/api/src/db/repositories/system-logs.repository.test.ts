import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createSystemLogsRepository } from "./system-logs.repository.js";
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

describe("SystemLogsRepository", () => {
  it("creates and lists logs newest first", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const logs = createSystemLogsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Log Tenant",
      planId: plan.id
    });

    await logs.create({ tenantId: tenant.id, level: "info", message: "primeira" });
    await logs.create({ tenantId: tenant.id, level: "error", message: "segunda" });

    const listed = await logs.list({ tenantId: tenant.id });

    expect(listed).toHaveLength(2);
    expect(listed[0]?.message).toBe("segunda");
    expect(listed[1]?.level).toBe("info");
  });

  it("filters by level", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const logs = createSystemLogsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Log Level Tenant",
      planId: plan.id
    });

    await logs.create({ tenantId: tenant.id, level: "warn", message: "aviso" });
    await logs.create({ tenantId: tenant.id, level: "error", message: "erro" });

    const warnings = await logs.list({ tenantId: tenant.id, level: "warn" });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toBe("aviso");
  });

  it("does not leak rows across tenants", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const logs = createSystemLogsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenantA = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant A",
      planId: plan.id
    });
    const tenantB = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant B",
      planId: plan.id
    });

    await logs.create({ tenantId: tenantA.id, level: "info", message: "de A" });
    await logs.create({ tenantId: tenantB.id, level: "info", message: "de B" });

    const forA = await logs.list({ tenantId: tenantA.id });

    expect(forA).toHaveLength(1);
    expect(forA[0]?.message).toBe("de A");
  });

  it("supports pagination", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const logs = createSystemLogsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Paged Tenant",
      planId: plan.id
    });

    for (const index of [1, 2, 3]) {
      await logs.create({ tenantId: tenant.id, level: "debug", message: `msg-${index}` });
    }

    const page = await logs.list({ tenantId: tenant.id, limit: 2, offset: 1 });

    expect(page).toHaveLength(2);
    expect(page[0]?.message).toBe("msg-2");
  });
});
