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
  const dependencies = {
    tenantAgentConfigs: {
      findLatestByTenantId: vi.fn()
    },
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
});
