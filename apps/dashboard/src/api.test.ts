import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWidgetSnippet,
  createTenant,
  createTenantDomain,
  createTenantApiKey,
  deleteTenant,
  deleteTenantDomain,
  getPlatformHealth,
  getTenantAgentConfig,
  getTenantConfig,
  getTenantConversation,
  inviteTenantUser,
  listPlans,
  listTenants,
  listTenantAnalytics,
  listTenantAuditLogs,
  listTenantConversations,
  listTenantApiKeys,
  listTenantSessions,
  listTenantRoles,
  listTenantUsers,
  listTenantDomains,
  listTenantSystemLogs,
  loginAdmin,
  refreshAdmin,
  revokeTenantApiKey,
  updateTenantUserRoles,
  updateTenantUserStatus,
  upsertTenantConfig,
  upsertTenantAgentConfig,
  updateTenant,
} from "./api.js";

const session = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresInSeconds: 900,
  user: {
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@acme.test",
    roles: ["platform_admin"],
  },
};

const tenant = {
  id: "tenant-1",
  publicId: "acme",
  name: "Acme",
  status: "active" as const,
  planId: "plan-starter",
  defaultLocale: "pt-BR",
  deletedAt: null,
};

const domain = {
  id: "domain-1",
  tenantId: "tenant-1",
  domain: "acme.com",
  isVerified: false,
};

const config = {
  tenantId: "tenant-1",
  theme: "dark" as const,
  primaryColor: "#111111",
  iconUrl: "https://example.com/icon.png",
  initialMessage: "Bem-vindo",
  placeholder: "Escreva aqui",
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
  isActive: true,
};

const user = {
  id: "user-1",
  tenantId: "tenant-1",
  email: "user@acme.test",
  status: "invited" as const,
  roles: ["viewer"],
  createdAt: "2026-08-14T12:00:00.000Z",
};

const role = {
  id: "role-1",
  slug: "viewer",
  name: "Viewer",
  description: "Read only",
  permissions: ["Visualizar conversas"],
};

const conversation = {
  id: "conversation-1",
  tenantId: "tenant-1",
  sessionId: "session-1",
  status: "open" as const,
  startedAt: "2026-08-14T12:00:00.000Z",
  endedAt: null,
  visitorId: "visitor-1",
  lastSeenAt: "2026-08-14T12:05:00.000Z",
  currentPage: "/pricing",
  pageTitle: "Pricing",
  pageUrl: "https://example.com/pricing",
  messageCount: 2,
  lastMessageAt: "2026-08-14T12:02:00.000Z",
};

const conversationDetail = {
  ...conversation,
  messages: [
    {
      id: "message-1",
      tenantId: "tenant-1",
      conversationId: "conversation-1",
      role: "user" as const,
      type: "text",
      content: { type: "text", text: "Oi" },
      metadata: {},
      providerMessageId: null,
      createdAt: "2026-08-14T12:01:00.000Z",
    },
  ],
};

const sessionRecord = {
  id: "session-1",
  tenantId: "tenant-1",
  visitorId: "visitor-1",
  startedAt: "2026-08-14T12:00:00.000Z",
  lastSeenAt: "2026-08-14T12:05:00.000Z",
  currentPage: "/pricing",
  pageTitle: "Pricing",
  pageUrl: "https://example.com/pricing",
  referrer: "https://google.com",
  conversationId: "conversation-1",
  conversationStatus: "open" as const,
};

const plan = {
  id: "plan-1",
  slug: "starter",
  name: "Starter",
  limits: {
    messagesPerMinute: 30,
    conversationsPerDay: 200,
  },
  priceCents: 0,
  isActive: true,
  createdAt: "2026-08-14T12:00:00.000Z",
  updatedAt: "2026-08-14T12:00:00.000Z",
};

const apiKey = {
  id: "key-1",
  name: "Dashboard key",
  prefix: "fqc_dash",
  last4: "19ab",
  lastUsedAt: null,
  revokedAt: null,
  createdAt: "2026-08-14T12:00:00.000Z",
};

const analyticsReport = {
  totalEvents: 3,
  eventTypeCounts: [{ value: "WidgetSessionStarted", count: 2 }],
  originCounts: [{ value: "https://example.com", count: 2 }],
  domainCounts: [{ value: "example.com", count: 2 }],
  deviceCounts: [{ value: "desktop", count: 2 }],
  resolutionCounts: [{ value: "1440x900", count: 2 }],
  timeline: [{ value: "2026-08-14", count: 2 }],
  events: [
    {
      id: "event-1",
      tenantId: "tenant-1",
      conversationId: "conversation-1",
      eventType: "WidgetSessionStarted",
      payload: { url: "https://example.com/pricing" },
      createdAt: "2026-08-14T12:00:00.000Z",
    },
  ],
};

const auditLog = {
  id: "audit-1",
  tenantId: "tenant-1",
  actorUserId: "user-1",
  actorUserEmail: "admin@acme.test",
  action: "tenant.updated",
  targetType: "tenant",
  targetId: "tenant-1",
  correlationId: "corr-1",
  metadata: { correlationId: "corr-1" },
  createdAt: "2026-08-14T12:00:00.000Z",
};

const systemLog = {
  id: "system-1",
  tenantId: "tenant-1",
  level: "info" as const,
  message: "Background job completed",
  correlationId: "corr-2",
  context: { correlationId: "corr-2" },
  createdAt: "2026-08-14T12:00:00.000Z",
};

const createdApiKey = {
  ...apiKey,
  secret: "fqc_1234567890",
};

const jsonResponse = (status: number, data: unknown) =>
  new Response(JSON.stringify({ data, meta: { correlationId: "corr-1" } }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const noContentResponse = () => new Response(null, { status: 204 });

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
      .mockResolvedValueOnce(noContentResponse())
      .mockResolvedValueOnce(jsonResponse(200, [domain]))
      .mockResolvedValueOnce(jsonResponse(200, domain))
      .mockResolvedValueOnce(jsonResponse(200, config))
      .mockResolvedValueOnce(jsonResponse(200, config))
      .mockResolvedValueOnce(jsonResponse(200, agentConfig))
      .mockResolvedValueOnce(jsonResponse(200, agentConfig))
      .mockResolvedValueOnce(jsonResponse(200, [user]))
      .mockResolvedValueOnce(jsonResponse(200, user))
      .mockResolvedValueOnce(jsonResponse(200, user))
      .mockResolvedValueOnce(jsonResponse(200, [role]))
      .mockResolvedValueOnce(jsonResponse(200, [plan]))
      .mockResolvedValueOnce(jsonResponse(200, [conversation]))
      .mockResolvedValueOnce(jsonResponse(200, conversationDetail))
      .mockResolvedValueOnce(jsonResponse(200, [sessionRecord]))
      .mockResolvedValueOnce(jsonResponse(200, [apiKey]))
      .mockResolvedValueOnce(jsonResponse(200, analyticsReport))
      .mockResolvedValueOnce(jsonResponse(200, [auditLog]))
      .mockResolvedValueOnce(jsonResponse(200, [systemLog]))
      .mockResolvedValueOnce(jsonResponse(200, createdApiKey))
      .mockResolvedValueOnce(jsonResponse(200, apiKey));

    await expect(
      loginAdmin({ email: "admin@acme.test", password: "senha-super-secreta" }),
    ).resolves.toEqual(session);
    await expect(refreshAdmin("refresh-token-1")).resolves.toEqual(session);
    await expect(listTenants("access-token-1")).resolves.toEqual([tenant]);
    await expect(
      createTenant("access-token-1", {
        publicId: "acme",
        name: "Acme",
        planId: "plan-starter",
        defaultLocale: "pt-BR",
      }),
    ).resolves.toEqual(tenant);
    await expect(
      updateTenant("access-token-1", "tenant-1", {
        publicId: "acme-2",
        name: "Acme 2",
        defaultLocale: "en-US",
        status: "inactive",
      }),
    ).resolves.toEqual(tenant);
    await expect(deleteTenant("access-token-1", "tenant-1")).resolves.toBeUndefined();
    await expect(listTenantDomains("access-token-1", "tenant-1")).resolves.toEqual([domain]);
    await expect(createTenantDomain("access-token-1", "tenant-1", "acme.com")).resolves.toEqual(
      domain,
    );
    await expect(getTenantConfig("access-token-1", "tenant-1")).resolves.toEqual(config);
    await expect(
      upsertTenantConfig("access-token-1", "tenant-1", {
        theme: "dark",
        primaryColor: "#111111",
        iconUrl: "https://example.com/icon.png",
        initialMessage: "Bem-vindo",
        placeholder: "Escreva aqui",
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
        isActive: true,
      }),
    ).resolves.toEqual(agentConfig);
    await expect(listTenantUsers("access-token-1", "tenant-1")).resolves.toEqual([user]);
    await expect(
      inviteTenantUser("access-token-1", "tenant-1", {
        email: "user@acme.test",
        roleSlug: "viewer",
      }),
    ).resolves.toEqual(user);
    await expect(
      updateTenantUserRoles("access-token-1", "tenant-1", "user-1", {
        roleSlugs: ["viewer"],
      }),
    ).resolves.toEqual(user);
    await expect(listTenantRoles("access-token-1", "tenant-1")).resolves.toEqual([role]);
    await expect(listPlans("access-token-1")).resolves.toEqual([plan]);
    await expect(listTenantConversations("access-token-1", "tenant-1")).resolves.toEqual([
      conversation,
    ]);
    await expect(
      getTenantConversation("access-token-1", "tenant-1", "conversation-1"),
    ).resolves.toEqual(conversationDetail);
    await expect(listTenantSessions("access-token-1", "tenant-1")).resolves.toEqual([
      sessionRecord,
    ]);
    await expect(listTenantApiKeys("access-token-1", "tenant-1")).resolves.toEqual([apiKey]);
    await expect(listTenantAnalytics("access-token-1", "tenant-1")).resolves.toEqual(
      analyticsReport,
    );
    await expect(listTenantAuditLogs("access-token-1", "tenant-1")).resolves.toEqual([auditLog]);
    await expect(listTenantSystemLogs("access-token-1", "tenant-1")).resolves.toEqual([systemLog]);
    await expect(
      createTenantApiKey("access-token-1", "tenant-1", {
        name: "Dashboard key",
      }),
    ).resolves.toEqual(createdApiKey);
    await expect(revokeTenantApiKey("access-token-1", "tenant-1", "key-1")).resolves.toEqual(
      apiKey,
    );

    const health = {
      status: "ok" as const,
      service: "api" as const,
      timestamp: "2026-08-14T12:00:00.000Z",
      checks: {
        database: "ok" as const,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, health));
    await expect(getPlatformHealth()).resolves.toEqual(health);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/v1/admin/tenants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1",
        }),
      }),
    );
  });

  it("deletes a tenant domain from a 204 No Content response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContentResponse());

    await expect(
      deleteTenantDomain("access-token-1", "tenant-1", "domain-2"),
    ).resolves.toBeUndefined();
  });

  it("updates a tenant user status", async () => {
    const updatedUser = {
      ...user,
      status: "suspended" as const,
    };

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedUser));

    await expect(
      updateTenantUserStatus("access-token-1", "tenant-1", "user-1", {
        status: "suspended",
      }),
    ).resolves.toEqual(updatedUser);
  });
});
