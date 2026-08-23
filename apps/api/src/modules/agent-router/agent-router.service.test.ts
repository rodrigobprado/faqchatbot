import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { createWebhookEndpointsRepository } from "../../db/repositories/webhook-endpoints.repository.js";
import { AnalyticsService } from "../analytics/analytics.service.js";
import { AgentRoutingError, type AgentRequest } from "./agent-adapter.js";
import { AgentRouterService } from "./agent-router.service.js";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

const createTenantWithAgent = async (overrides: { timeoutMs?: number; retryPolicy?: Record<string, unknown> } = {}) => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const webhooks = createWebhookEndpointsRepository(db);
  const agentConfigs = createTenantAgentConfigsRepository(db);

  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  const tenant = await tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
  const webhook = await webhooks.create({
    tenantId: tenant.id,
    url: "https://n8n.internal.example.com/webhook/acme",
    secretRef: "top-secret-value"
  });
  await agentConfigs.upsert({
    tenantId: tenant.id,
    provider: "n8n",
    webhookEndpointId: webhook.id,
    timeoutMs: overrides.timeoutMs ?? 5000,
    retryPolicy: overrides.retryPolicy ?? {}
  });

  return { tenant, webhook };
};

const buildRequest = async (tenantId: string): Promise<AgentRequest> => {
  const visitorId = randomUUID();
  const session = await createVisitorSessionsRepository(db).create({ tenantId, visitorId, pageContext: {} });
  const conversation = await createConversationsRepository(db).create({ tenantId, sessionId: session.id });

  return {
    tenantId,
    conversationId: conversation.id,
    visitorId,
    message: { type: "text", text: "Ola" }
  };
};

describe("AgentRouterService.route", () => {
  it("routes to the n8n adapter configured for the tenant", async () => {
    const { tenant } = await createTenantWithAgent();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: "Oi!" }) }));
    const router = new AgentRouterService(db, new AnalyticsService(db));

    const response = await router.route(await buildRequest(tenant.id));

    expect(response.content).toEqual({ type: "text", text: "Oi!" });
  });

  it("throws a safe error when the tenant has no active agent configured", async () => {
    const plans = createPlansRepository(db);
    const tenants = createTenantsRepository(db);
    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
    const tenant = await tenants.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const router = new AgentRouterService(db, new AnalyticsService(db));

    await expect(router.route(await buildRequest(tenant.id))).rejects.toBeInstanceOf(AgentRoutingError);
  });

  it("retries a failed webhook call up to the configured attempts", async () => {
    const { tenant } = await createTenantWithAgent({ retryPolicy: { maxAttempts: 3, backoffMs: 1 } });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ text: "Recuperado" }) });
    vi.stubGlobal("fetch", fetchMock);
    const router = new AgentRouterService(db, new AnalyticsService(db));

    const response = await router.route(await buildRequest(tenant.id));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.content).toEqual({ type: "text", text: "Recuperado" });
  });

  it("gives up after exhausting retries and throws a safe error", async () => {
    const { tenant, webhook } = await createTenantWithAgent({ retryPolicy: { maxAttempts: 2, backoffMs: 1 } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`boom at ${webhook.url}`)));
    const router = new AgentRouterService(db, new AnalyticsService(db));

    await expect(router.route(await buildRequest(tenant.id))).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AgentRoutingError);
      expect((error as Error).message).not.toContain(webhook.url);
      expect((error as Error).message).not.toContain(webhook.secretRef);
      return true;
    });
  });

  it("opens the circuit breaker after repeated failures for the same tenant", async () => {
    const { tenant } = await createTenantWithAgent({ retryPolicy: { maxAttempts: 1 } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const router = new AgentRouterService(db, new AnalyticsService(db));

    for (let i = 0; i < 3; i += 1) {
      await expect(router.route(await buildRequest(tenant.id))).rejects.toBeInstanceOf(AgentRoutingError);
    }

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(router.route(await buildRequest(tenant.id))).rejects.toBeInstanceOf(AgentRoutingError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
