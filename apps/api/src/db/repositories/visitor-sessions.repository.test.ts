import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";
import { createVisitorSessionsRepository } from "./visitor-sessions.repository.js";

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
  return tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
};

describe("VisitorSessionsRepository", () => {
  it("creates a session with the given page context", async () => {
    const tenant = await createTenant();
    const sessions = createVisitorSessionsRepository(db);
    const visitorId = randomUUID();

    const session = await sessions.create({
      tenantId: tenant.id,
      visitorId,
      pageContext: { url: "https://acme.example.com/pricing" }
    });

    expect(session.tenantId).toBe(tenant.id);
    expect(session.visitorId).toBe(visitorId);
    expect(session.pageContext).toEqual({ url: "https://acme.example.com/pricing" });
  });

  it("returns null for a session id that does not exist", async () => {
    const sessions = createVisitorSessionsRepository(db);

    const found = await sessions.findById(randomUUID());

    expect(found).toBeNull();
  });

  it("touches a session, replacing its page context and bumping lastSeenAt", async () => {
    const tenant = await createTenant();
    const sessions = createVisitorSessionsRepository(db);
    const session = await sessions.create({
      tenantId: tenant.id,
      visitorId: randomUUID(),
      pageContext: { url: "https://acme.example.com/" }
    });

    const touched = await sessions.touch(session.id, { url: "https://acme.example.com/checkout" });

    expect(touched.id).toBe(session.id);
    expect(touched.pageContext).toEqual({ url: "https://acme.example.com/checkout" });
    expect(touched.lastSeenAt.getTime()).toBeGreaterThanOrEqual(session.lastSeenAt.getTime());
  });

  it("lists sessions for a tenant, most recently seen first, respecting limit and offset", async () => {
    const tenant = await createTenant();
    const sessions = createVisitorSessionsRepository(db);
    const first = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });

    const page = await sessions.listByTenantId(tenant.id, { limit: 1, offset: 0 });

    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe(second.id);

    const nextPage = await sessions.listByTenantId(tenant.id, { limit: 1, offset: 1 });
    expect(nextPage[0]?.id).toBe(first.id);
  });
});
