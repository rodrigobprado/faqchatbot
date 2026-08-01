import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AgentRouterService } from "./agent-router.service.js";
import type { AgentAdapter, AgentProvider } from "./agent-adapter.js";

const createAdapter = (provider: AgentProvider): AgentAdapter => ({
  provider,
  route: vi.fn(async (input) => ({
    provider,
    model: input.agentConfig?.model ?? null,
    providerMessageId: `${provider}-message`,
    content: {
      type: "text",
      text: `${provider}:${typeof input.message.text === "string" ? input.message.text : "Mensagem recebida."}`
    },
    metadata: {
      provider,
      conversationId: input.conversationId
    }
  }))
});

const createService = () => {
  const n8nAdapter = createAdapter("n8n");
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  const dependencies = {
    tenantAgentConfigs: {
      findLatestByTenantId: vi.fn()
    },
    logger,
    adapters: {
      n8n: n8nAdapter,
      openai_responses: createAdapter("openai_responses"),
      langgraph: createAdapter("langgraph"),
      flowise: createAdapter("flowise"),
      dify: createAdapter("dify"),
      crewai: createAdapter("crewai"),
      mcp: createAdapter("mcp"),
      custom: createAdapter("custom")
    }
  } as const;

  return { service: new AgentRouterService(dependencies), dependencies };
};

describe("AgentRouterService", () => {
  it("rejects requests without a tenant id", async () => {
    const { service } = createService();

    await expect(
      service.route({
        tenantId: "",
        conversationId: randomUUID(),
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).rejects.toThrow("Tenant is required for agent routing");
  });

  it("routes through the provider configured for the tenant", async () => {
    const { service, dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue({
      id: randomUUID(),
      tenantId,
      provider: "openai_responses",
      model: "gpt-4.1-mini",
      webhookEndpointId: null,
      encryptedCredentialsRef: null,
      routingRules: {},
      timeoutMs: 15_000,
      retryPolicy: {},
      isActive: true
    });

    const response = await service.route({
      tenantId,
      conversationId,
      message: {
        type: "text",
        text: "Ola"
      }
    });

    expect(response.provider).toBe("openai_responses");
    expect(response.content).toEqual({
      type: "text",
      text: "openai_responses:Ola"
    });
    expect(dependencies.adapters.openai_responses.route).toHaveBeenCalledTimes(1);
    expect(dependencies.logger.info).toHaveBeenCalledWith(
      "agent routing started",
      expect.objectContaining({
        provider: "openai_responses",
        tenantId,
        conversationId
      })
    );
  });

  it("honors a service-level retry override", async () => {
    const { dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue({
      id: randomUUID(),
      tenantId,
      provider: "openai_responses",
      model: null,
      webhookEndpointId: null,
      encryptedCredentialsRef: null,
      routingRules: {},
      timeoutMs: 15_000,
      retryPolicy: {},
      isActive: true
    });

    const routeSpy = vi
      .spyOn(dependencies.adapters.openai_responses, "route")
      .mockResolvedValueOnce({
        provider: "openai_responses",
        model: null,
        providerMessageId: "provider-message",
        content: {
          type: "text",
          text: "ok"
        },
        metadata: {}
      });

    const overriddenService = new AgentRouterService({
      tenantAgentConfigs: dependencies.tenantAgentConfigs,
      adapters: dependencies.adapters,
      logger: dependencies.logger,
      retryAttempts: 4
    });

    await expect(
      overriddenService.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).resolves.toMatchObject({
      provider: "openai_responses"
    });

    expect(routeSpy).toHaveBeenCalledTimes(1);
    expect(dependencies.logger.info).toHaveBeenCalledWith(
      "agent routing started",
      expect.objectContaining({
        attempts: 4
      })
    );
  });

  it("falls back to n8n when the tenant has no active agent config", async () => {
    const { service, dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue({
      id: randomUUID(),
      tenantId,
      provider: "custom",
      model: null,
      webhookEndpointId: null,
      encryptedCredentialsRef: null,
      routingRules: {},
      timeoutMs: 15_000,
      retryPolicy: {},
      isActive: false
    });

    const response = await service.route({
      tenantId,
      conversationId,
      message: {
        type: "markdown",
        markdown: "**Ola**"
      }
    });

    expect(response.provider).toBe("n8n");
    expect(response.content).toEqual({
      type: "text",
      text: "n8n:Mensagem recebida."
    });
    expect(dependencies.adapters.n8n.route).toHaveBeenCalledTimes(1);
  });

  it("retries failed providers and eventually recovers", async () => {
    const { service, dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const provider = dependencies.adapters.openai_responses;
    const failure = new Error("provider down");

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue({
      id: randomUUID(),
      tenantId,
      provider: "openai_responses",
      model: "gpt-4.1-mini",
      webhookEndpointId: null,
      encryptedCredentialsRef: null,
      routingRules: { attempts: 2 },
      timeoutMs: 15_000,
      retryPolicy: { attempts: 2 },
      isActive: true
    });

    vi.mocked(provider.route)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({
        provider: "openai_responses",
        model: "gpt-4.1-mini",
        providerMessageId: "provider-message",
        content: {
          type: "text",
          text: "ok"
        },
        metadata: {}
      });

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).resolves.toMatchObject({
      provider: "openai_responses",
      content: {
        type: "text",
        text: "ok"
      }
    });

    expect(provider.route).toHaveBeenCalledTimes(2);
    expect(dependencies.logger.warn).toHaveBeenCalledWith(
      "agent routing attempt failed",
      expect.objectContaining({
        provider: "openai_responses",
        attempt: 1
      })
    );
  });

  it("opens the circuit after repeated failures", async () => {
    const { service, dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue({
      id: randomUUID(),
      tenantId,
      provider: "openai_responses",
      model: null,
      webhookEndpointId: null,
      encryptedCredentialsRef: null,
      routingRules: { attempts: 1 },
      timeoutMs: 15_000,
      retryPolicy: { attempts: 1 },
      isActive: true
    });

    vi.mocked(dependencies.adapters.openai_responses.route).mockRejectedValue(new Error("provider down"));

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).rejects.toThrow("Agent provider failed");

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).rejects.toThrow("Agent provider failed");

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).rejects.toThrow("Agent provider failed");

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).rejects.toThrow("temporarily unavailable");
  });

  it("expires an open circuit when the cool-down passes", async () => {
    const { service, dependencies } = createService();
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const failureState = (service as unknown as {
      failureState: Map<AgentProvider, { consecutiveFailures: number; openUntil: number | null }>;
    }).failureState;

    dependencies.tenantAgentConfigs.findLatestByTenantId.mockResolvedValue(null);
    failureState.set("n8n", {
      consecutiveFailures: 3,
      openUntil: Date.now() - 1
    });

    await expect(
      service.route({
        tenantId,
        conversationId,
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).resolves.toMatchObject({
      provider: "n8n"
    });

    expect(failureState.has("n8n")).toBe(false);
  });
});
