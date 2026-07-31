import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createAuditLogsRepository } from "../../db/repositories/audit-logs.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createPermissionsRepository } from "../../db/repositories/permissions.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
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

  it("lists the tenant's conversations most recent first", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const sessions = createVisitorSessionsRepository(db);
    const conversations = createConversationsRepository(db);
    const session = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });
    const first = await conversations.create({ tenantId: tenant.id, sessionId: session.id });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await conversations.create({ tenantId: tenant.id, sessionId: session.id });

    const page = await tenantsService.listConversations(tenant.id, { limit: 1 });

    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe(second.id);
    void first;
  });

  it("lists the tenant's visitor sessions most recently seen first", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const sessions = createVisitorSessionsRepository(db);
    const first = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await sessions.create({ tenantId: tenant.id, visitorId: randomUUID(), pageContext: {} });

    const page = await tenantsService.listSessions(tenant.id, { limit: 1 });

    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe(second.id);
    void first;
  });

  it("lists the tenant's audit logs most recent first", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const logs = createAuditLogsRepository(db);
    const first = await logs.create({ tenantId: tenant.id, action: "a", targetType: "tenant", targetId: tenant.id });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await logs.create({ tenantId: tenant.id, action: "b", targetType: "tenant", targetId: tenant.id });

    const page = await tenantsService.listAuditLogs(tenant.id, { limit: 1 });

    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe(second.id);
    void first;
  });

  it("creates a user with roles and lists it with the granted role slugs", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    await tenantsService.createRole(tenant.id, { slug: "support", name: "Support" });

    const email = `agent-${randomUUID()}@acme.example.com`;
    const created = await tenantsService.createUser(tenant.id, {
      email,
      password: "password123",
      roleSlugs: ["support"]
    });

    expect(created.email).toBe(email);
    expect(JSON.stringify(created)).not.toContain("password123");

    const list = await tenantsService.listUsers(tenant.id);
    const found = list.find((row) => row.id === created.id);
    expect(found?.roleSlugs).toEqual(["support"]);
  });

  it("creates a role with permissions and lists it with the granted permission slugs", async () => {
    const plan = await createPlan();
    const tenant = await tenantsService.create({
      publicId: `tenant-${randomUUID()}`,
      name: "Acme Inc",
      planId: plan.id
    });
    const permissionSlug = `custom:${randomUUID()}`;
    await createPermissionsRepository(db).create({ slug: permissionSlug });

    const created = await tenantsService.createRole(tenant.id, {
      slug: "billing",
      name: "Billing",
      permissionSlugs: [permissionSlug]
    });

    const list = await tenantsService.listRoles(tenant.id);
    const found = list.find((row) => row.id === created.id);
    expect(found?.permissionSlugs).toEqual([permissionSlug]);
  });

  it("lists every global permission", async () => {
    const slug = `custom:${randomUUID()}`;
    await createPermissionsRepository(db).create({ slug });

    const all = await tenantsService.listPermissions();

    expect(all.some((permission) => permission.slug === slug)).toBe(true);
  });
});
