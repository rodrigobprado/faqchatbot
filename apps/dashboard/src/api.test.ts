import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWidgetSnippet,
  deleteTenant,
  createTenant,
  createTenantDomain,
  getTenantAgentConfig,
  getTenantConfig,
  listTenants,
  listTenantDomains,
  loginAdmin,
  refreshAdmin,
  upsertTenantConfig,
  upsertTenantAgentConfig,
  updateTenant
} from "./api.js";

const session = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresInSeconds: 900,
  user: {
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@acme.test",
    roles: ["platform_admin"]
  }
};

const tenant = {
  id: "tenant-1",
  publicId: "acme",
  name: "Acme",
  status: "active" as const,
  planId: "plan-starter",
  defaultLocale: "pt-BR",
  deletedAt: null
};

const domain = {
  id: "domain-1",
  tenantId: "tenant-1",
  domain: "acme.com",
  isVerified: false
};

const config = {
  tenantId: "tenant-1",
  theme: "dark" as const,
  primaryColor: "#111111",
  iconUrl: "https://example.com/icon.png",
  initialMessage: "Bem-vindo",
  placeholder: "Escreva aqui"
};

const agentConfig = {
  id: "agent-config-1",
  tenantId: "tenant-1",
  provider: "openai_responses" as const,
  model: "gpt-4.1-mini",
  webhookEndpointId: "11111111-1111-4111-8111-111111111111",
  encryptedCredentialsRef: "vault://tenant-1/agent",
  routingRules: { fallback: "n8n" },
  timeoutMs: 20000,
  retryPolicy: { attempts: 2 },
  isActive: true
};

const jsonResponse = (status: number, data: unknown) =>
  new Response(JSON.stringify({ data, meta: { correlationId: "corr-1" } }), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("buildWidgetSnippet", () => {
  it("builds a production embed snippet for a tenant", () => {
    expect(buildWidgetSnippet("acme")).toBe(
      '<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=acme" data-agent="acme" async></script>',
    );
  });

  it("escapes attribute characters in the embed snippet", () => {
    expect(buildWidgetSnippet('acme" onload="alert(1)')).toContain("&quot;");
  });
});

describe("API helpers", () => {
  it("logs in, refreshes, lists tenants and creates tenants", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, session))
      .mockResolvedValueOnce(jsonResponse(200, session))
      .mockResolvedValueOnce(jsonResponse(200, [tenant]))
      .mockResolvedValueOnce(jsonResponse(200, tenant))
      .mockResolvedValueOnce(jsonResponse(200, tenant))
      .mockResolvedValueOnce(jsonResponse(200, tenant))
      .mockResolvedValueOnce(jsonResponse(200, [domain]))
      .mockResolvedValueOnce(jsonResponse(200, domain))
      .mockResolvedValueOnce(jsonResponse(200, config))
      .mockResolvedValueOnce(jsonResponse(200, config))
      .mockResolvedValueOnce(jsonResponse(200, agentConfig))
      .mockResolvedValueOnce(jsonResponse(200, agentConfig));

    await expect(loginAdmin({ email: "admin@acme.test", password: "senha-super-secreta" })).resolves.toEqual(
      session,
    );
    await expect(refreshAdmin("refresh-token-1")).resolves.toEqual(session);
    await expect(listTenants("access-token-1")).resolves.toEqual([tenant]);
    await expect(
      createTenant("access-token-1", {
        publicId: "acme",
        name: "Acme",
        planSlug: "starter",
        defaultLocale: "pt-BR"
      }),
    ).resolves.toEqual(tenant);
    await expect(
      updateTenant("access-token-1", "tenant-1", {
        publicId: "acme-2",
        name: "Acme 2",
        defaultLocale: "en-US",
        status: "inactive"
      }),
    ).resolves.toEqual(tenant);
    await expect(deleteTenant("access-token-1", "tenant-1")).resolves.toEqual(tenant);
    await expect(listTenantDomains("access-token-1", "tenant-1")).resolves.toEqual([domain]);
    await expect(createTenantDomain("access-token-1", "tenant-1", "acme.com")).resolves.toEqual(domain);
    await expect(getTenantConfig("access-token-1", "tenant-1")).resolves.toEqual(config);
    await expect(
      upsertTenantConfig("access-token-1", "tenant-1", {
        theme: "dark",
        primaryColor: "#111111",
        iconUrl: "https://example.com/icon.png",
        initialMessage: "Bem-vindo",
        placeholder: "Escreva aqui"
      }),
    ).resolves.toEqual(config);
    await expect(getTenantAgentConfig("access-token-1", "tenant-1")).resolves.toEqual(agentConfig);
    await expect(
      upsertTenantAgentConfig("access-token-1", "tenant-1", {
        provider: "openai_responses",
        model: "gpt-4.1-mini",
        webhookEndpointId: "11111111-1111-4111-8111-111111111111",
        encryptedCredentialsRef: "vault://tenant-1/agent",
        routingRules: { fallback: "n8n" },
        timeoutMs: 20000,
        retryPolicy: { attempts: 2 },
        isActive: true
      }),
    ).resolves.toEqual(agentConfig);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/v1/admin/tenants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1"
        })
      }),
    );
  });
});
