import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { TenantsService } from "./tenants.service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;
let tenantsService: TenantsService;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  tenantsService = new TenantsService(db);
});

afterAll(async () => {
  await client.end();
});

const createPlan = () => createPlansRepository(db).create({ slug: `plan-${randomUUID()}`, name: "Starter" });

describe("TenantsService", () => {
  it("creates, updates and soft-deletes a tenant", async () => {
    const plan = await createPlan();

    const created = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id,
      defaultLocale: "pt-BR"
    });
    expect(created.status).toBe("active");

    const updated = await tenantsService.update(created.id, { status: "suspended" });
    expect(updated?.status).toBe("suspended");

    await tenantsService.remove(created.id);
    await expect(tenantsService.get(created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws NotFoundException for an unknown tenant id", async () => {
    await expect(tenantsService.get(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it("manages authorized domains for a tenant", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });

    const domain = await tenantsService.addDomain(tenant.id, { domain: "acme.example.com" });
    const domains = await tenantsService.listDomains(tenant.id);
    expect(domains).toHaveLength(1);

    await tenantsService.removeDomain(tenant.id, domain.id);
    expect(await tenantsService.listDomains(tenant.id)).toHaveLength(0);
  });

  it("upserts the visual config for a tenant", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });

    await tenantsService.upsertConfig(tenant.id, {
      theme: "dark",
      primaryColor: "#000000",
      initialMessage: "Ola",
      placeholder: "Digite..."
    });
    const config = await tenantsService.getConfig(tenant.id);
    expect(config?.theme).toBe("dark");
  });

  it("upserts the agent config and never exposes the webhook secret in the response", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });

    const agentConfig = await tenantsService.upsertAgentConfig(tenant.id, {
      provider: "n8n",
      webhookUrl: "https://n8n.internal/webhook/abc",
      webhookSecretRef: "secrets-manager://tenant/webhook-secret",
      timeoutMs: 15000,
      retryPolicy: {}
    });

    expect(JSON.stringify(agentConfig)).not.toContain("secrets-manager://tenant/webhook-secret");
    expect(JSON.stringify(agentConfig)).not.toContain("https://n8n.internal/webhook/abc");

    const found = await tenantsService.getAgentConfig(tenant.id);
    expect(found?.provider).toBe("n8n");
  });

  it("resolves effective rate limits and lets an override take precedence", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });

    const before = await tenantsService.getRateLimits(tenant.id);
    expect(before.overrides).toHaveLength(0);
    expect(before.effective.find((policy) => policy.scope === "tenant")).toBeTruthy();

    await tenantsService.upsertRateLimit(tenant.id, { scope: "tenant", limit: 5, windowSeconds: 30 });

    const after = await tenantsService.getRateLimits(tenant.id);
    expect(after.overrides).toHaveLength(1);
    expect(after.effective.find((policy) => policy.scope === "tenant")).toMatchObject({
      limit: 5,
      windowSeconds: 30
    });
  });

  it("aggregates analytics events for a tenant within the requested period", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const events = createAnalyticsEventsRepository(db);
    await events.record({ tenantId: tenant.id, eventType: "WidgetSessionStarted", payload: {} });
    await events.record({ tenantId: tenant.id, eventType: "AgentRoutingCompleted", payload: { durationMs: 400 } });

    const analytics = await tenantsService.getAnalytics(tenant.id, {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000)
    });

    expect(analytics.totalsByEventType).toEqual(
      expect.arrayContaining([
        { eventType: "WidgetSessionStarted", count: 1 },
        { eventType: "AgentRoutingCompleted", count: 1 }
      ]),
    );
    expect(analytics.averageResponseTimeMs).toBe(400);
    expect(analytics.averageConversationDurationMs).toBeNull();
  });

  it("throws NotFoundException when requesting analytics for an unknown tenant", async () => {
    await expect(tenantsService.getAnalytics(randomUUID(), {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
