import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";
import { createTenantAgentConfigsRepository } from "./tenant-agent-configs.repository.js";
import { createTenantConfigsRepository } from "./tenant-configs.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";
import { createWebhookEndpointsRepository } from "./webhook-endpoints.repository.js";

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

describe("TenantConfigsRepository", () => {
  it("creates a visual config on first upsert and updates it on the second", async () => {
    const tenant = await createTenant();
    const configs = createTenantConfigsRepository(db);

    const created = await configs.upsert({ tenantId: tenant.id, theme: "dark", primaryColor: "#111111" });
    expect(created.theme).toBe("dark");

    const updated = await configs.upsert({ tenantId: tenant.id, theme: "light", primaryColor: "#ffffff" });
    expect(updated.id).toBe(created.id);
    expect(updated.theme).toBe("light");

    const found = await configs.findByTenantId(tenant.id);
    expect(found?.primaryColor).toBe("#ffffff");
  });
});

describe("WebhookEndpointsRepository", () => {
  it("stores only a secret reference, never the raw secret", async () => {
    const tenant = await createTenant();
    const webhooks = createWebhookEndpointsRepository(db);

    const endpoint = await webhooks.create({
      tenantId: tenant.id,
      url: "https://n8n.internal/webhook/abc",
      secretRef: "secrets-manager://tenant/webhook-secret"
    });

    const found = await webhooks.findById(endpoint.id);
    expect(found?.secretRef).toBe("secrets-manager://tenant/webhook-secret");
  });
});

describe("TenantAgentConfigsRepository", () => {
  it("creates an agent config on first upsert and updates it on the second", async () => {
    const tenant = await createTenant();
    const webhooks = createWebhookEndpointsRepository(db);
    const agentConfigs = createTenantAgentConfigsRepository(db);

    const endpoint = await webhooks.create({
      tenantId: tenant.id,
      url: "https://n8n.internal/webhook/abc",
      secretRef: "secrets-manager://tenant/webhook-secret"
    });

    const created = await agentConfigs.upsert({
      tenantId: tenant.id,
      provider: "n8n",
      webhookEndpointId: endpoint.id
    });
    expect(created.provider).toBe("n8n");

    const updated = await agentConfigs.upsert({
      tenantId: tenant.id,
      provider: "openai_responses",
      model: "gpt-5"
    });
    expect(updated.id).toBe(created.id);
    expect(updated.provider).toBe("openai_responses");
    expect(updated.model).toBe("gpt-5");

    const found = await agentConfigs.findByTenantId(tenant.id);
    expect(found?.provider).toBe("openai_responses");
  });
});
