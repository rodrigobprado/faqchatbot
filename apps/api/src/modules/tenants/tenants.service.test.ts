import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AdminAccessTokenPayload } from "../../auth/admin-token.js";
import { TenantsService } from "./tenants.service.js";

const platformAdmin = (): AdminAccessTokenPayload => ({
  scope: "admin",
  userId: randomUUID(),
  tenantId: randomUUID(),
  roles: ["platform_admin", "admin"],
  issuedAt: 1,
  expiresAt: 2,
});

const tenantAdmin = (tenantId: string): AdminAccessTokenPayload => ({
  scope: "admin",
  userId: randomUUID(),
  tenantId,
  roles: ["admin"],
  issuedAt: 1,
  expiresAt: 2,
});

const createService = () => {
  const dependencies = {
    tenants: {
      create: vi.fn(),
      findById: vi.fn(),
      findByPublicId: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    },
    tenantDomains: {
      create: vi.fn(),
      listByTenantId: vi.fn(),
      delete: vi.fn(),
    },
    tenantConfigs: {
      findByTenantId: vi.fn(),
      upsert: vi.fn(),
    },
    tenantAgentConfigs: {
      findLatestByTenantId: vi.fn(),
      upsert: vi.fn(),
    },
    users: {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      listByTenantId: vi.fn(),
      updateStatus: vi.fn(),
    },
    userRoles: {
      assignRole: vi.fn(),
      removeRolesByUserId: vi.fn(),
      listRoleSlugsByUserId: vi.fn(),
    },
    roles: {
      create: vi.fn(),
      findByTenantIdAndSlug: vi.fn(),
      listByTenantId: vi.fn(),
    },
    apiKeys: {
      create: vi.fn(),
      findById: vi.fn(),
      listByTenantId: vi.fn(),
      revoke: vi.fn(),
    },
    visitorSessions: {
      findById: vi.fn(),
      listByTenantId: vi.fn(),
    },
    conversations: {
      findById: vi.fn(),
      listByTenantId: vi.fn(),
      findLatestBySessionId: vi.fn(),
    },
    messages: {
      listByConversationId: vi.fn(),
    },
    plans: {
      findBySlug: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
    },
  } as const;

  return { service: new TenantsService(dependencies), dependencies };
};

describe("TenantsService", () => {
  it("creates a tenant for platform admins", async () => {
    const { service, dependencies } = createService();

    dependencies.plans.findBySlug.mockResolvedValue({
      id: "plan-1",
      slug: "starter",
      name: "Starter",
      limits: { messagesPerMinute: 30, conversationsPerDay: 200 },
    });
    dependencies.tenants.create.mockResolvedValue({
      id: "tenant-1",
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });

    const created = await service.createTenant(platformAdmin(), {
      publicId: "acme",
      name: "Acme",
      planSlug: "starter",
    });

    expect(created.publicId).toBe("acme");
    expect(dependencies.tenants.create).toHaveBeenCalledWith({
      publicId: "acme",
      name: "Acme",
      planId: "plan-1",
      defaultLocale: "pt-BR",
    });
  });

  it("lists all tenants for platform admins", async () => {
    const { service, dependencies } = createService();
    const tenants = [
      {
        id: randomUUID(),
        publicId: "acme",
        name: "Acme",
        status: "active" as const,
        planId: "plan-1",
        defaultLocale: "pt-BR",
        deletedAt: null,
      },
      {
        id: randomUUID(),
        publicId: "beta",
        name: "Beta",
        status: "inactive" as const,
        planId: "plan-1",
        defaultLocale: "en-US",
        deletedAt: null,
      },
    ];

    dependencies.tenants.list.mockResolvedValue(tenants);

    await expect(service.listTenants(platformAdmin())).resolves.toEqual(tenants);
    expect(dependencies.tenants.list).toHaveBeenCalledTimes(1);
  });

  it("lists conversations with visitor context for tenant admins", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const conversationId = randomUUID();
    const sessionId = randomUUID();
    const startedAt = new Date("2026-08-14T12:00:00.000Z");
    const lastSeenAt = new Date("2026-08-14T12:05:00.000Z");

    dependencies.conversations.listByTenantId.mockResolvedValue([
      {
        id: conversationId,
        tenantId: "tenant-a",
        sessionId,
        status: "open",
        startedAt,
        endedAt: null,
      },
    ]);
    dependencies.visitorSessions.findById.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      visitorId: "visitor-1",
      pageContext: {
        currentPage: "/pricing",
        title: "Pricing",
        url: "https://example.com/pricing",
      },
      lastSeenAt,
    });
    dependencies.messages.listByConversationId.mockResolvedValue([
      {
        id: randomUUID(),
        tenantId: "tenant-a",
        conversationId,
        role: "user",
        type: "text",
        content: { type: "text", text: "Oi" },
        metadata: null,
        providerMessageId: null,
        createdAt: new Date("2026-08-14T12:01:00.000Z"),
      },
      {
        id: randomUUID(),
        tenantId: "tenant-a",
        conversationId,
        role: "assistant",
        type: "text",
        content: { type: "text", text: "Olá" },
        metadata: null,
        providerMessageId: null,
        createdAt: new Date("2026-08-14T12:02:00.000Z"),
      },
    ]);

    await expect(service.listConversations(actor, "tenant-a")).resolves.toEqual([
      expect.objectContaining({
        id: conversationId,
        sessionId,
        visitorId: "visitor-1",
        currentPage: "/pricing",
        messageCount: 2,
        lastMessageAt: "2026-08-14T12:02:00.000Z",
      }),
    ]);
  });

  it("lists widget sessions with conversation context for tenant admins", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const sessionId = randomUUID();
    const conversationId = randomUUID();

    dependencies.visitorSessions.listByTenantId.mockResolvedValue([
      {
        id: sessionId,
        tenantId: "tenant-a",
        visitorId: "visitor-1",
        pageContext: {
          currentPage: "/pricing",
          title: "Pricing",
          url: "https://example.com/pricing",
          referrer: "https://google.com",
        },
        startedAt: new Date("2026-08-14T12:00:00.000Z"),
        lastSeenAt: new Date("2026-08-14T12:05:00.000Z"),
      },
    ]);
    dependencies.conversations.findLatestBySessionId.mockResolvedValue({
      id: conversationId,
      tenantId: "tenant-a",
      sessionId,
      status: "open",
      startedAt: new Date("2026-08-14T12:00:00.000Z"),
      endedAt: null,
    });

    await expect(service.listSessions(actor, "tenant-a")).resolves.toEqual([
      expect.objectContaining({
        id: sessionId,
        visitorId: "visitor-1",
        currentPage: "/pricing",
        referrer: "https://google.com",
        conversationId,
        conversationStatus: "open",
      }),
    ]);
  });

  it("lists widget sessions even when no conversation exists yet", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const sessionId = randomUUID();

    dependencies.visitorSessions.listByTenantId.mockResolvedValue([
      {
        id: sessionId,
        tenantId: "tenant-a",
        visitorId: "visitor-2",
        pageContext: {
          currentPage: "/pricing",
          title: "Pricing",
          url: "https://example.com/pricing",
        },
        startedAt: new Date("2026-08-14T12:00:00.000Z"),
        lastSeenAt: null,
      },
    ]);
    dependencies.conversations.findLatestBySessionId.mockResolvedValue(null);

    await expect(service.listSessions(actor, "tenant-a")).resolves.toEqual([
      expect.objectContaining({
        id: sessionId,
        conversationId: null,
        conversationStatus: null,
        lastSeenAt: null,
      }),
    ]);
  });

  it("lists conversations without visitor session data when the session is missing", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const conversationId = randomUUID();
    const sessionId = randomUUID();

    dependencies.conversations.listByTenantId.mockResolvedValue([
      {
        id: conversationId,
        tenantId: "tenant-a",
        sessionId,
        status: "closed",
        startedAt: new Date("2026-08-14T12:00:00.000Z"),
        endedAt: new Date("2026-08-14T12:10:00.000Z"),
      },
    ]);
    dependencies.visitorSessions.findById.mockResolvedValue(null);
    dependencies.messages.listByConversationId.mockResolvedValue([]);

    await expect(service.listConversations(actor, "tenant-a")).resolves.toEqual([
      expect.objectContaining({
        id: conversationId,
        visitorId: null,
        currentPage: null,
        pageTitle: null,
        pageUrl: null,
      }),
    ]);
  });

  it("lists available plans for admins", async () => {
    const { service, dependencies } = createService();
    const plans = [
      {
        id: "plan-1",
        slug: "starter",
        name: "Starter",
        limits: { messagesPerMinute: 30, conversationsPerDay: 200 },
      },
      {
        id: "plan-2",
        slug: "growth",
        name: "Growth",
        limits: { messagesPerMinute: 60, conversationsPerDay: 500 },
      },
    ];

    dependencies.plans.list.mockResolvedValue(plans);

    await expect(service.listPlans(platformAdmin())).resolves.toEqual(plans);
    expect(dependencies.plans.list).toHaveBeenCalledTimes(1);
  });

  it("lists only the current tenant for non-platform admins", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const tenant = {
      id: "tenant-a",
      publicId: "acme",
      name: "Acme",
      status: "active" as const,
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    };

    dependencies.tenants.findById.mockResolvedValue(tenant);

    await expect(service.listTenants(actor)).resolves.toEqual([tenant]);
    expect(dependencies.tenants.findById).toHaveBeenCalledWith("tenant-a");
  });

  it("rejects tenant creation for non-platform admins", async () => {
    const { service } = createService();

    await expect(
      service.createTenant(tenantAdmin("tenant-a"), {
        publicId: "acme",
        name: "Acme",
      }),
    ).rejects.toThrow("Platform admin role required");
  });

  it("rejects invalid tenant payloads", async () => {
    const { service } = createService();

    await expect(service.createTenant(platformAdmin(), { publicId: "", name: "" })).rejects.toThrow(
      "Invalid tenant payload",
    );
  });

  it("rejects unknown plans when creating tenants", async () => {
    const { service, dependencies } = createService();

    dependencies.plans.findBySlug.mockResolvedValue(null);

    await expect(
      service.createTenant(platformAdmin(), {
        publicId: "acme",
        name: "Acme",
        planSlug: "growth",
      }),
    ).rejects.toThrow("Plan growth was not found");
  });

  it("returns a tenant for admin users in the same tenant", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const tenant = {
      id: "tenant-a",
      publicId: "acme",
      name: "Acme",
      status: "active" as const,
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    };

    dependencies.tenants.findById.mockResolvedValue(tenant);

    await expect(service.getTenant(actor, "tenant-a")).resolves.toEqual(tenant);
  });

  it("returns a public config assembled from tenant, plan and overrides", async () => {
    const { service, dependencies } = createService();
    const tenantId = "11111111-1111-4111-8111-111111111111";

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: tenantId,
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    dependencies.plans.findById.mockResolvedValue({
      id: "plan-1",
      slug: "starter",
      name: "Starter",
      limits: { messagesPerMinute: 50, conversationsPerDay: 400 },
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([
      { id: "domain-1", tenantId, domain: "example.com", isVerified: true },
    ]);
    dependencies.tenantConfigs.findByTenantId.mockResolvedValue({
      tenantId,
      theme: "dark",
      primaryColor: "#111111",
      iconUrl: "https://example.com/icon.png",
      initialMessage: "Bem-vindo",
      placeholder: "Escreva aqui",
    });

    const config = await service.getPublicConfig("acme");

    expect(config.publicId).toBe("acme");
    expect(config.theme).toBe("dark");
    expect(config.domain).toBe("example.com");
    expect(config.limits.messagesPerMinute).toBe(50);
  });

  it("returns conversation details with messages", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const conversationId = randomUUID();
    const sessionId = randomUUID();

    dependencies.conversations.findById.mockResolvedValue({
      id: conversationId,
      tenantId: "tenant-a",
      sessionId,
      status: "open",
      startedAt: new Date("2026-08-14T12:00:00.000Z"),
      endedAt: null,
    });
    dependencies.visitorSessions.findById.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      visitorId: "visitor-1",
      pageContext: {
        currentPage: "/pricing",
        title: "Pricing",
        url: "https://example.com/pricing",
      },
      lastSeenAt: new Date("2026-08-14T12:05:00.000Z"),
    });
    dependencies.messages.listByConversationId.mockResolvedValue([
      {
        id: randomUUID(),
        tenantId: "tenant-a",
        conversationId,
        role: "user",
        type: "text",
        content: { type: "text", text: "Oi" },
        metadata: null,
        providerMessageId: null,
        createdAt: new Date("2026-08-14T12:01:00.000Z"),
      },
    ]);

    await expect(service.getConversation(actor, "tenant-a", conversationId)).resolves.toEqual(
      expect.objectContaining({
        id: conversationId,
        visitorId: "visitor-1",
        messages: [
          expect.objectContaining({
            id: expect.any(String),
            createdAt: "2026-08-14T12:01:00.000Z",
          }),
        ],
      }),
    );
  });

  it("falls back to defaults when public config data is incomplete", async () => {
    const { service, dependencies } = createService();
    const tenantId = "11111111-1111-4111-8111-111111111111";

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: tenantId,
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    dependencies.plans.findById.mockResolvedValue({
      id: "plan-1",
      slug: "starter",
      name: "Starter",
      limits: { messagesPerMinute: -1, conversationsPerDay: "x" },
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([]);
    dependencies.tenantConfigs.findByTenantId.mockResolvedValue({
      tenantId,
      theme: "neon",
      primaryColor: undefined as never,
      iconUrl: null,
      initialMessage: "Bem-vindo",
      placeholder: "Escreva aqui",
    });

    const config = await service.getPublicConfig("acme");

    expect(config.domain).toBe("acme");
    expect(config.theme).toBe("auto");
    expect(config.primaryColor).toBe("#2563eb");
    expect(config.limits).toEqual({ messagesPerMinute: 30, conversationsPerDay: 200 });
  });

  it("rejects missing tenants and plans in public config lookups", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findByPublicId.mockResolvedValueOnce(null);
    await expect(service.getPublicConfig("missing")).rejects.toThrow(
      "Tenant missing was not found",
    );

    dependencies.tenants.findByPublicId.mockResolvedValueOnce({
      id: "tenant-1",
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    dependencies.plans.findById.mockResolvedValueOnce(null);
    await expect(service.getPublicConfig("acme")).rejects.toThrow(
      "Plan for tenant acme was not found",
    );
  });

  it("rejects tenant access for admins from another tenant", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findById.mockResolvedValue(null);

    await expect(service.getTenant(tenantAdmin("tenant-a"), "tenant-b")).rejects.toThrow(
      "Tenant access denied",
    );
  });

  it("covers tenant mutation and config validation failures", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");

    await expect(service.createDomain(actor, "tenant-b", {})).rejects.toThrow(
      "Tenant access denied",
    );

    await expect(service.createDomain(actor, "tenant-a", { domain: "" })).rejects.toThrow(
      "Invalid domain payload",
    );
    await expect(service.deleteDomain(actor, "tenant-b", "domain-1")).rejects.toThrow(
      "Tenant access denied",
    );
    await expect(
      service.upsertTenantConfig(actor, "tenant-a", { theme: "invalid" }),
    ).rejects.toThrow("Invalid tenant config payload");
    await expect(
      service.upsertTenantAgentConfig(actor, "tenant-a", { provider: "invalid" }),
    ).rejects.toThrow("Invalid tenant agent config payload");
    await expect(
      service.updateTenant(actor, "tenant-a", { planSlug: "starter", status: "invalid" as never }),
    ).rejects.toThrow("Invalid tenant payload");
    await expect(
      service.inviteUser(actor, "tenant-a", { email: "not-an-email", roleSlug: "viewer" }),
    ).rejects.toThrow("Invalid user payload");

    dependencies.tenants.findById.mockResolvedValueOnce({
      id: "tenant-a",
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    await expect(service.updateTenant(actor, "tenant-a", { planSlug: "starter" })).rejects.toThrow(
      "Plan starter was not found",
    );

    dependencies.plans.findBySlug.mockResolvedValueOnce({
      id: "plan-1",
      slug: "starter",
      name: "Starter",
      limits: { messagesPerMinute: 30, conversationsPerDay: 200 },
    });
    dependencies.tenants.findById.mockResolvedValueOnce({
      id: "tenant-a",
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    dependencies.tenants.update.mockResolvedValueOnce(null);
    await expect(service.updateTenant(actor, "tenant-a", { planSlug: "starter" })).rejects.toThrow(
      "Tenant tenant-a was not found",
    );

    dependencies.tenants.softDelete.mockResolvedValueOnce(null);
    await expect(service.deleteTenant(actor, "tenant-a")).rejects.toThrow(
      "Tenant tenant-a was not found",
    );

    dependencies.tenantDomains.delete.mockResolvedValueOnce(null);
    await expect(service.deleteDomain(actor, "tenant-a", "domain-1")).rejects.toThrow(
      "Domain domain-1 was not found",
    );
  });

  it("deletes a tenant domain for authorized admins", async () => {
    const { service, dependencies } = createService();
    const actor = platformAdmin();
    const tenantId = "tenant-a";
    const domainId = "domain-1";

    dependencies.tenantDomains.delete.mockResolvedValueOnce({
      id: domainId,
      tenantId,
      domain: "acme.com",
      isVerified: false,
    });

    await expect(service.deleteDomain(actor, tenantId, domainId)).resolves.toEqual({
      id: domainId,
      tenantId,
      domain: "acme.com",
      isVerified: false,
    });
    expect(dependencies.tenantDomains.delete).toHaveBeenCalledWith(domainId);
  });

  it("manages users, roles and api keys", async () => {
    const { service, dependencies } = createService();
    const actor = platformAdmin();
    const tenantId = "tenant-a";
    const userId = randomUUID();
    const apiKeyId = randomUUID();

    dependencies.tenants.findById.mockResolvedValue({
      id: tenantId,
      publicId: "acme",
      name: "Acme",
      status: "active",
      planId: "plan-1",
      defaultLocale: "pt-BR",
      deletedAt: null,
    });
    dependencies.users.listByTenantId.mockResolvedValue([
      {
        id: userId,
        tenantId,
        email: "admin@acme.test",
        passwordHash: "hash",
        status: "active",
        createdAt: new Date("2026-08-14T12:00:00.000Z"),
        updatedAt: new Date("2026-08-14T12:00:00.000Z"),
      },
    ]);
    dependencies.userRoles.listRoleSlugsByUserId.mockResolvedValue([{ slug: "admin" }]);
    dependencies.roles.listByTenantId.mockResolvedValue([
      { id: "role-1", tenantId, slug: "admin", name: "Administrator", createdAt: new Date() },
    ]);
    dependencies.roles.findByTenantIdAndSlug.mockResolvedValue({
      id: "role-1",
      tenantId,
      slug: "admin",
      name: "Administrator",
      createdAt: new Date(),
    });
    dependencies.users.create.mockResolvedValue({
      id: userId,
      tenantId,
      email: "novo@acme.test",
      passwordHash: "hash",
      status: "invited",
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
    });
    dependencies.users.findById.mockResolvedValue({
      id: userId,
      tenantId,
      email: "novo@acme.test",
      passwordHash: "hash",
      status: "invited",
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
      updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    });
    dependencies.apiKeys.create.mockResolvedValue({
      id: apiKeyId,
      tenantId,
      name: "Key",
      hashedKey: "hash",
      prefix: "fqc_1234",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
    });
    dependencies.apiKeys.listByTenantId.mockResolvedValue([
      {
        id: apiKeyId,
        tenantId,
        name: "Key",
        hashedKey: "hash",
        prefix: "fqc_1234",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date("2026-08-14T12:00:00.000Z"),
      },
    ]);
    dependencies.apiKeys.findById.mockResolvedValue({
      id: apiKeyId,
      tenantId,
      name: "Key",
      hashedKey: "hash",
      prefix: "fqc_1234",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
    });
    dependencies.apiKeys.revoke.mockResolvedValue({
      id: apiKeyId,
      tenantId,
      name: "Key",
      hashedKey: "hash",
      prefix: "fqc_1234",
      lastUsedAt: null,
      revokedAt: new Date("2026-08-14T12:10:00.000Z"),
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
    });

    await expect(service.listUsers(actor, tenantId)).resolves.toEqual([
      {
        id: userId,
        tenantId,
        email: "admin@acme.test",
        status: "active",
        roles: ["admin"],
        createdAt: "2026-08-14T12:00:00.000Z",
        updatedAt: "2026-08-14T12:00:00.000Z",
      },
    ]);

    await expect(
      service.inviteUser(actor, tenantId, { email: "novo@acme.test", roleSlug: "admin" }),
    ).resolves.toMatchObject({
      email: "novo@acme.test",
      status: "invited",
      roles: ["admin"],
    });

    await expect(
      service.updateUserRoles(actor, tenantId, userId, { roleSlugs: ["admin"] }),
    ).resolves.toMatchObject({
      id: userId,
      roles: ["admin"],
    });

    dependencies.users.updateStatus.mockResolvedValue({
      id: userId,
      tenantId,
      email: "admin@acme.test",
      passwordHash: "hash",
      status: "suspended",
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
      updatedAt: new Date("2026-08-14T12:10:00.000Z"),
    });
    dependencies.userRoles.listRoleSlugsByUserId.mockResolvedValueOnce([{ slug: "admin" }]);

    await expect(
      service.updateUserStatus(actor, tenantId, userId, { status: "suspended" }),
    ).resolves.toMatchObject({
      id: userId,
      status: "suspended",
      roles: ["admin"],
      updatedAt: "2026-08-14T12:10:00.000Z",
    });

    await expect(service.listRoles(actor, tenantId)).resolves.toEqual([
      expect.objectContaining({
        slug: "admin",
        permissions: expect.arrayContaining(["Criar api keys"]),
      }),
    ]);

    await expect(service.listApiKeys(actor, tenantId)).resolves.toEqual([
      expect.objectContaining({
        id: apiKeyId,
        name: "Key",
        prefix: "fqc_1234",
      }),
    ]);

    await expect(service.createApiKey(actor, tenantId, { name: "Key" })).resolves.toEqual(
      expect.objectContaining({
        name: "Key",
        prefix: "fqc_1234",
        secret: expect.stringMatching(/^fqc_/),
      }),
    );

    await expect(service.revokeApiKey(actor, tenantId, apiKeyId)).resolves.toEqual(
      expect.objectContaining({
        id: apiKeyId,
        revokedAt: "2026-08-14T12:10:00.000Z",
      }),
    );
  });

  it("rejects api key revocations when the key is missing or cannot be revoked", async () => {
    const { service, dependencies } = createService();
    const actor = tenantAdmin("tenant-a");
    const apiKeyId = randomUUID();

    dependencies.apiKeys.findById.mockResolvedValueOnce(null);
    await expect(service.revokeApiKey(actor, "tenant-a", apiKeyId)).rejects.toThrow(
      `Api key ${apiKeyId} was not found`,
    );

    dependencies.apiKeys.findById.mockResolvedValueOnce({
      id: apiKeyId,
      tenantId: "tenant-a",
      name: "Dashboard",
      hashedKey: "hash",
      prefix: "fqc_dash",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });
    dependencies.apiKeys.revoke.mockResolvedValueOnce(null);
    await expect(service.revokeApiKey(actor, "tenant-a", apiKeyId)).rejects.toThrow(
      `Api key ${apiKeyId} was not found`,
    );
  });

  it("creates default roles on demand and rejects unknown roles", async () => {
    const { service, dependencies } = createService();
    const actor = platformAdmin();
    const tenantId = "tenant-b";
    const defaultRoles = [
      { id: "role-1", tenantId, slug: "admin", name: "Administrator", createdAt: new Date() },
      { id: "role-2", tenantId, slug: "editor", name: "Editor", createdAt: new Date() },
      { id: "role-3", tenantId, slug: "viewer", name: "Viewer", createdAt: new Date() },
      { id: "role-4", tenantId, slug: "operator", name: "Operator", createdAt: new Date() },
    ];

    dependencies.roles.listByTenantId.mockResolvedValueOnce([]).mockResolvedValue(defaultRoles);
    dependencies.roles.create.mockResolvedValue({
      id: "role-1",
      tenantId,
      slug: "admin",
      name: "Administrator",
      createdAt: new Date(),
    });
    dependencies.roles.findByTenantIdAndSlug.mockResolvedValue(null);

    await expect(service.listRoles(actor, tenantId)).resolves.toHaveLength(4);
    expect(dependencies.roles.create).toHaveBeenCalledTimes(4);

    await expect(
      service.inviteUser(actor, tenantId, { email: "novo@acme.test", roleSlug: "custom-role" }),
    ).rejects.toThrow("Role custom-role was not found");
  });

  it("rejects malformed user role and api key payloads", async () => {
    const { service, dependencies } = createService();
    const actor = platformAdmin();
    const tenantId = "tenant-c";

    dependencies.users.findById.mockResolvedValue({
      id: "user-1",
      tenantId,
      email: "user@acme.test",
      passwordHash: "hash",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    dependencies.roles.listByTenantId.mockResolvedValue([]);
    dependencies.roles.create.mockResolvedValue({
      id: "role-1",
      tenantId,
      slug: "admin",
      name: "Administrator",
      createdAt: new Date(),
    });
    dependencies.roles.findByTenantIdAndSlug.mockResolvedValue({
      id: "role-1",
      tenantId,
      slug: "admin",
      name: "Administrator",
      createdAt: new Date(),
    });

    await expect(
      service.updateUserRoles(actor, tenantId, "user-1", { roleSlugs: [] }),
    ).rejects.toThrow("Invalid user roles payload");
    await expect(
      service.updateUserStatus(actor, tenantId, "user-1", { status: "invalid" }),
    ).rejects.toThrow("Invalid user status payload");
    await expect(service.createApiKey(actor, tenantId, {})).rejects.toThrow(
      "Invalid api key payload",
    );
  });
});
