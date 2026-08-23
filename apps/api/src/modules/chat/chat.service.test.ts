import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, type MessageEvent } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Redis } from "ioredis";
import type { Sql } from "postgres";
import { filter, firstValueFrom, take } from "rxjs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AgentRouterService } from "../agent-router/agent-router.service.js";
import { createDatabase, type Database } from "../../db/client.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { createWebhookEndpointsRepository } from "../../db/repositories/webhook-endpoints.repository.js";
import { analyticsEvents } from "../../db/schema.js";
import { AnalyticsService } from "../analytics/analytics.service.js";
import type { WidgetTokenClaims } from "../auth/access-token-claims.js";
import { RateLimiterService } from "../rate-limit/rate-limiter.service.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { ChatStreamBroker } from "./chat-stream.broker.js";
import { ChatService } from "./chat.service.js";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) {
  throw new Error("DATABASE_URL and REDIS_URL are required to run repository integration tests");
}

let db: Database;
let client: Sql;
let redis: Redis;
let rateLimit: RateLimitService;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  redis = new Redis(redisUrl);
  rateLimit = new RateLimitService(new RateLimiterService(redis), db, new AnalyticsService(db));
});

afterAll(async () => {
  await client.end();
  await redis.quit();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const createChatService = () =>
  new ChatService(
    db,
    new ChatStreamBroker(),
    new AgentRouterService(db, new AnalyticsService(db)),
    rateLimit,
    new AnalyticsService(db),
  );

const createConversationClaims = async (): Promise<WidgetTokenClaims> => {
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
  const visitorId = randomUUID();
  const session = await sessions.create({ tenantId: tenant.id, visitorId, pageContext: {} });
  const conversation = await conversations.create({ tenantId: tenant.id, sessionId: session.id });

  return {
    sub: visitorId,
    tenantId: tenant.id,
    sessionId: session.id,
    conversationId: conversation.id,
    scope: "widget"
  };
};

const configureN8nAgent = async (tenantId: string) => {
  const webhook = await createWebhookEndpointsRepository(db).create({
    tenantId,
    url: "https://n8n.internal.example.com/webhook/acme",
    secretRef: "top-secret-value"
  });
  await createTenantAgentConfigsRepository(db).upsert({
    tenantId,
    provider: "n8n",
    webhookEndpointId: webhook.id,
    timeoutMs: 5000
  });
};

describe("ChatService.sendMessage", () => {
  it("persists the user message and returns it", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    const message = await chatService.sendMessage(claims, {
      conversationId: claims.conversationId,
      content: { type: "text", text: "Ola" }
    });

    expect(message.role).toBe("user");
    expect(message.conversationId).toBe(claims.conversationId);
    expect(message.content).toEqual({ type: "text", text: "Ola" });
  });

  it("sanitizes markdown content before persisting", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    const message = await chatService.sendMessage(claims, {
      conversationId: claims.conversationId,
      content: { type: "markdown", markdown: 'Ola <script>alert(1)</script> **mundo**' }
    });

    expect(message.content).toEqual({ type: "markdown", markdown: "Ola  **mundo**" });
  });

  it("rejects a conversationId that does not match the token", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    await expect(
      chatService.sendMessage(claims, {
        conversationId: randomUUID(),
        content: { type: "text", text: "Ola" }
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects malformed rich content", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    await expect(
      chatService.sendMessage(claims, {
        conversationId: claims.conversationId,
        content: { type: "card" }
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("streams typing and token events, then persists and emits the assistant reply", async () => {
    const broker = new ChatStreamBroker();
    const chatService = new ChatService(
      db,
      broker,
      new AgentRouterService(db, new AnalyticsService(db)),
      rateLimit,
      new AnalyticsService(db),
    );
    const claims = await createConversationClaims();
    await configureN8nAgent(claims.tenantId);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: "Oi, tudo bem?" }) }),
    );

    const typingEventPromise: Promise<MessageEvent> = firstValueFrom(
      broker.stream(claims.conversationId).pipe(
        filter((event) => JSON.parse(event.data as string).type === "typing"),
        take(1),
      ),
    );
    const messageEventPromise: Promise<MessageEvent> = firstValueFrom(
      broker.stream(claims.conversationId).pipe(
        filter((event) => JSON.parse(event.data as string).type === "message"),
        take(1),
      ),
    );

    await chatService.sendMessage(claims, {
      conversationId: claims.conversationId,
      content: { type: "text", text: "Ola" }
    });

    await typingEventPromise;
    const messageEvent = await messageEventPromise;
    const parsed = JSON.parse(messageEvent.data as string);

    expect(parsed.type).toBe("message");
    expect(parsed.message.role).toBe("assistant");
    expect(parsed.message.content).toEqual({ type: "text", text: "Oi, tudo bem?" });

    const history = await chatService.getHistory(claims, claims.conversationId);
    expect(history).toHaveLength(2);
    expect(history[1]?.role).toBe("assistant");
  });

  it("emits a generic error event when the agent has no provider configured", async () => {
    const broker = new ChatStreamBroker();
    const chatService = new ChatService(
      db,
      broker,
      new AgentRouterService(db, new AnalyticsService(db)),
      rateLimit,
      new AnalyticsService(db),
    );
    const claims = await createConversationClaims();

    const errorEventPromise: Promise<MessageEvent> = firstValueFrom(
      broker.stream(claims.conversationId).pipe(
        filter((event) => JSON.parse(event.data as string).type === "error"),
        take(1),
      ),
    );

    await chatService.sendMessage(claims, {
      conversationId: claims.conversationId,
      content: { type: "text", text: "Ola" }
    });

    const errorEvent = await errorEventPromise;
    const parsed = JSON.parse(errorEvent.data as string);

    expect(parsed.type).toBe("error");
    expect(parsed.message).not.toMatch(/webhook|n8n|http/i);

    const history = await chatService.getHistory(claims, claims.conversationId);
    expect(history).toHaveLength(1);
  });
});

describe("ChatService.getHistory", () => {
  it("rejects a conversationId that does not match the token", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    await expect(chatService.getHistory(claims, randomUUID())).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("ChatService.stream", () => {
  it("rejects a conversationId that does not match the token", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    expect(() => chatService.stream(claims, randomUUID())).toThrow(ForbiddenException);
  });
});

describe("ChatService.recordButtonClick", () => {
  it("records a ButtonClicked analytics event for the conversation", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    chatService.recordButtonClick(claims, { conversationId: claims.conversationId, buttonId: "cta-1" });

    await vi.waitFor(async () => {
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.tenantId, claims.tenantId), eq(analyticsEvents.eventType, "ButtonClicked")));

      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({ type: "ButtonClicked", buttonId: "cta-1" });
    });
  });

  it("rejects a conversationId that does not match the token", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    expect(() =>
      chatService.recordButtonClick(claims, { conversationId: randomUUID(), buttonId: "cta-1" }),
    ).toThrow(ForbiddenException);
  });
});

describe("ChatService.endConversation", () => {
  it("closes the conversation and records its duration and reason", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    await chatService.endConversation(claims, claims.conversationId, { reason: "resolved" });

    const conversation = await createConversationsRepository(db).findById(claims.conversationId);
    expect(conversation?.status).toBe("closed");
    expect(conversation?.endedAt).toBeTruthy();

    await vi.waitFor(async () => {
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.tenantId, claims.tenantId), eq(analyticsEvents.eventType, "ConversationEnded")));

      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({ type: "ConversationEnded", reason: "resolved" });
      expect((events[0]?.payload as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  it("rejects a conversationId that does not match the token", async () => {
    const chatService = createChatService();
    const claims = await createConversationClaims();

    await expect(chatService.endConversation(claims, randomUUID(), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
