import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createConversationsRepository } from "./conversations.repository.js";
import { createMessagesRepository } from "./messages.repository.js";
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

describe("MessagesRepository", () => {
  it("creates and lists messages by conversation", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const visitorSessions = createVisitorSessionsRepository(db);
    const conversations = createConversationsRepository(db);
    const messages = createMessagesRepository(db);

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

    const created = await messages.create({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "user",
      type: "text",
      content: {
        type: "text",
        text: "Ola"
      },
      metadata: {
        source: "widget"
      }
    });
    const listed = await messages.listByConversationId(conversation.id);
    const latest = await messages.findLatestByConversationId(conversation.id);
    const foundById = await messages.findById(created.id);

    expect(created.id).toBeDefined();
    expect(foundById?.conversationId).toBe(conversation.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(foundById?.id);
    expect(latest?.id).toBe(foundById?.id);
  });
});
