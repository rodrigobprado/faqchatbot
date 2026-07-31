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

const createSession = async () => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const sessions = createVisitorSessionsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  const tenant = await tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
  const session = await sessions.create({
    tenantId: tenant.id,
    visitorId: randomUUID(),
    pageContext: {}
  });

  return { tenant, session };
};

describe("ConversationsRepository", () => {
  it("creates an open conversation tied to a session", async () => {
    const { tenant, session } = await createSession();
    const conversations = createConversationsRepository(db);

    const conversation = await conversations.create({ tenantId: tenant.id, sessionId: session.id });

    expect(conversation.tenantId).toBe(tenant.id);
    expect(conversation.sessionId).toBe(session.id);
    expect(conversation.status).toBe("open");
  });

  it("returns null for a conversation id that does not exist", async () => {
    const conversations = createConversationsRepository(db);

    const found = await conversations.findById(randomUUID());

    expect(found).toBeNull();
  });

  it("finds the most recent open conversation for a session", async () => {
    const { tenant, session } = await createSession();
    const conversations = createConversationsRepository(db);
    await conversations.create({ tenantId: tenant.id, sessionId: session.id });
    const second = await conversations.create({ tenantId: tenant.id, sessionId: session.id });

    const found = await conversations.findLatestOpenBySessionId(session.id);

    expect(found?.id).toBe(second.id);
  });

  it("returns null when the session has no open conversation", async () => {
    const { session } = await createSession();
    const conversations = createConversationsRepository(db);

    const found = await conversations.findLatestOpenBySessionId(session.id);

    expect(found).toBeNull();
  });
});
