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

describe("VisitorSessionsRepository", () => {
  it("creates, finds and touches visitor sessions", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const visitorSessions = createVisitorSessionsRepository(db);

    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Tenant",
      planId: plan.id
    });

    const session = await visitorSessions.create({
      tenantId: tenant.id,
      visitorId: randomUUID(),
      pageContext: {
        url: "https://example.com",
        viewport: { width: 1280, height: 720 },
        timestamp: "2026-08-01T00:00:00.000Z",
        utm: {}
      }
    });

    const foundById = await visitorSessions.findById(session.id);
    const foundByTenantAndVisitor = await visitorSessions.findLatestByTenantAndVisitor(
      tenant.id,
      session.visitorId
    );
    const touched = await visitorSessions.touch(session.id, {
      url: "https://example.com/pricing",
      viewport: { width: 1280, height: 720 },
      timestamp: "2026-08-01T00:01:00.000Z",
      utm: {}
    });

    expect(foundById?.id).toBe(session.id);
    expect(foundByTenantAndVisitor?.id).toBe(session.id);
    expect(touched?.pageContext.url).toBe("https://example.com/pricing");
  });
});
