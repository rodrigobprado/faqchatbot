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

const createConversation = async () => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const sessions = createVisitorSessionsRepository(db);
  const conversations = createConversationsRepository(db);

  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  const tenant = await tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
  const session = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });
  const conversation = await conversations.create({ tenantId: tenant.id, sessionId: session.id });

  return { tenant, conversation };
};

describe("MessagesRepository", () => {
  it("creates a message and reads it back", async () => {
    const { tenant, conversation } = await createConversation();
    const messages = createMessagesRepository(db);

    const message = await messages.create({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "user",
      type: "text",
      content: { type: "text", text: "Ola" }
    });

    expect(message.role).toBe("user");
    expect(message.content).toEqual({ type: "text", text: "Ola" });
  });

  it("lists messages for a conversation ordered by creation time", async () => {
    const { tenant, conversation } = await createConversation();
    const messages = createMessagesRepository(db);

    const first = await messages.create({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "user",
      type: "text",
      content: { type: "text", text: "Primeira" }
    });
    const second = await messages.create({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "assistant",
      type: "text",
      content: { type: "text", text: "Segunda" }
    });

    const history = await messages.listByConversationId(conversation.id);

    expect(history.map((message) => message.id)).toEqual([first.id, second.id]);
  });

  it("does not mix messages from different conversations", async () => {
    const { tenant, conversation } = await createConversation();
    const other = await createConversation();
    const messages = createMessagesRepository(db);

    await messages.create({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "user",
      type: "text",
      content: { type: "text", text: "Nesta conversa" }
    });
    await messages.create({
      tenantId: other.tenant.id,
      conversationId: other.conversation.id,
      role: "user",
      type: "text",
      content: { type: "text", text: "Na outra" }
    });

    const history = await messages.listByConversationId(conversation.id);

    expect(history).toHaveLength(1);
  });
});
