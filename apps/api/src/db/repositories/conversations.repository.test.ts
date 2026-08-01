import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createConversationsRepository } from "./conversations.repository.js";
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

describe("ConversationsRepository", () => {
  it("creates and finds conversations by session", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const visitorSessions = createVisitorSessionsRepository(db);
    const conversations = createConversationsRepository(db);

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

    const conversation = await conversations.create({
      tenantId: tenant.id,
      sessionId: session.id
    });

    const foundById = await conversations.findById(conversation.id);
    const foundBySession = await conversations.findLatestBySessionId(session.id);

    expect(foundById?.id).toBe(conversation.id);
    expect(foundBySession?.sessionId).toBe(session.id);
  });
});
