import { describe, expect, it, vi } from "vitest";
import { WidgetSessionService } from "./widget-session.service.js";

const baseRequest = {
  agentId: "empresa123",
  context: {
    url: "https://example.com/pricing",
    viewport: { width: 1440, height: 900 },
    timestamp: "2026-08-01T00:00:00.000Z",
    utm: {}
  }
};

const createService = () => {
  const dependencies = {
    tenants: {
      findByPublicId: vi.fn()
    },
    tenantDomains: {
      listByTenantId: vi.fn()
    },
    visitorSessions: {
      create: vi.fn(),
      findById: vi.fn(),
      findLatestByTenantAndVisitor: vi.fn(),
      touch: vi.fn()
    },
    conversations: {
      create: vi.fn(),
      findById: vi.fn(),
      findLatestBySessionId: vi.fn()
    },
    widgetTokenSecret: "test-widget-secret-test-widget-secret",
    widgetTokenTtlSeconds: 900
  } as const;

  return { service: new WidgetSessionService(dependencies), dependencies };
};

describe("WidgetSessionService", () => {
  it("starts a new widget session and conversation", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "active",
      defaultLocale: "pt-BR"
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([{ domain: "example.com" }]);
    dependencies.visitorSessions.findById.mockResolvedValue(null);
    dependencies.visitorSessions.findLatestByTenantAndVisitor.mockResolvedValue(null);
    dependencies.visitorSessions.create.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      tenantId: "11111111-1111-4111-8111-111111111111",
      visitorId: "33333333-3333-4333-8333-333333333333"
    });
    dependencies.conversations.findById.mockResolvedValue(null);
    dependencies.conversations.findLatestBySessionId.mockResolvedValue(null);
    dependencies.conversations.create.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      tenantId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222"
    });

    const response = await service.start(baseRequest, { origin: "https://example.com" });

    expect(response.tenant.publicId).toBe("empresa123");
    expect(response.sessionId).toBe("22222222-2222-4222-8222-222222222222");
    expect(response.conversationId).toBe("44444444-4444-4444-8444-444444444444");
    expect(response.accessToken).toContain(".");
    expect(dependencies.visitorSessions.create).toHaveBeenCalledOnce();
    expect(dependencies.conversations.create).toHaveBeenCalledOnce();
  });

  it("reuses existing session and conversation when ids are provided", async () => {
    const { service, dependencies } = createService();
    const sessionId = "22222222-2222-4222-8222-222222222222";
    const conversationId = "44444444-4444-4444-8444-444444444444";

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "active",
      defaultLocale: "pt-BR"
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([{ domain: "example.com" }]);
    dependencies.visitorSessions.findById.mockResolvedValue({
      id: sessionId,
      tenantId: "11111111-1111-4111-8111-111111111111",
      visitorId: "33333333-3333-4333-8333-333333333333"
    });
    dependencies.visitorSessions.touch.mockResolvedValue({
      id: sessionId,
      tenantId: "11111111-1111-4111-8111-111111111111",
      visitorId: "33333333-3333-4333-8333-333333333333"
    });
    dependencies.visitorSessions.findLatestByTenantAndVisitor.mockResolvedValue(null);
    dependencies.conversations.findById.mockResolvedValue({
      id: conversationId,
      tenantId: "11111111-1111-4111-8111-111111111111",
      sessionId
    });
    dependencies.conversations.findLatestBySessionId.mockResolvedValue(null);

    const response = await service.start(
      {
        ...baseRequest,
        sessionId,
        conversationId
      },
      { origin: "https://example.com", referer: "https://example.com/pricing" },
    );

    expect(response.sessionId).toBe(sessionId);
    expect(response.conversationId).toBe(conversationId);
    expect(dependencies.visitorSessions.create).not.toHaveBeenCalled();
    expect(dependencies.conversations.create).not.toHaveBeenCalled();
  });

  it("rejects inactive tenants", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "inactive",
      defaultLocale: "pt-BR"
    });

    await expect(service.start(baseRequest, { origin: "https://example.com" })).rejects.toThrow(
      "not active",
    );
  });

  it("rejects unauthorized domains", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "active",
      defaultLocale: "pt-BR"
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([{ domain: "example.com" }]);

    await expect(
      service.start(baseRequest, { origin: "https://malicious.example" }),
    ).rejects.toThrow("not authorized");
  });

  it("rejects malformed payloads", async () => {
    const { service, dependencies } = createService();

    dependencies.tenants.findByPublicId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "active",
      defaultLocale: "pt-BR"
    });
    dependencies.tenantDomains.listByTenantId.mockResolvedValue([{ domain: "example.com" }]);

    await expect(
      service.start(
        {
          agentId: "empresa123",
          context: {
            url: "javascript:alert(1)",
            viewport: { width: 1440, height: 900 },
            timestamp: "2026-08-01T00:00:00.000Z",
            utm: {}
          }
        },
        { origin: "https://example.com" },
      ),
    ).rejects.toThrow("Invalid widget session payload");
  });
});
