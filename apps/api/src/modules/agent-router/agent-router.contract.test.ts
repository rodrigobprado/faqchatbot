import type { AgentProvider } from "@faqchatbot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AgentAdapter,
  AgentRequest,
  TenantAgentConfigRow,
  WebhookEndpointRow
} from "./agent-adapter.js";
import { AgentRoutingError } from "./agent-adapter.js";
import { CrewAiAdapter } from "./crewai.adapter.js";
import { CustomAgentAdapter } from "./custom.adapter.js";
import { DifyAdapter } from "./dify.adapter.js";
import { FlowiseAdapter } from "./flowise.adapter.js";
import { LangGraphAdapter } from "./langgraph.adapter.js";
import { McpServerAdapter } from "./mcp.adapter.js";
import { N8nAgentAdapter } from "./n8n-agent.adapter.js";
import { OpenAiResponsesAdapter } from "./openai-responses.adapter.js";

const WEBHOOK_URL = "https://provider.internal/hook/secret-path";

const buildRequest = (): AgentRequest => ({
  tenantId: "tenant-1",
  conversationId: "conversation-1",
  visitorId: "visitor-1",
  message: { type: "text", text: "Qual o horario de funcionamento?" }
});

const buildWebhook = (): WebhookEndpointRow =>
  ({
    id: "webhook-1",
    tenantId: "tenant-1",
    url: WEBHOOK_URL,
    secretRef: "super-secret",
    isActive: true,
    createdAt: new Date()
  }) as unknown as WebhookEndpointRow;

const buildConfig = (overrides: Partial<TenantAgentConfigRow> = {}): TenantAgentConfigRow =>
  ({
    provider: "n8n",
    model: null,
    timeoutMs: 5000,
    retryPolicy: {},
    routingRules: {},
    isActive: true,
    webhookEndpointId: "webhook-1",
    ...overrides
  }) as unknown as TenantAgentConfigRow;

type AdapterCase = {
  provider: AgentProvider;
  adapter: AgentAdapter;
  successPayload: unknown;
};

const CASES: readonly AdapterCase[] = [
  { provider: "n8n", adapter: new N8nAgentAdapter(), successPayload: { text: "Das 9 as 18h." } },
  {
    provider: "openai_responses",
    adapter: new OpenAiResponsesAdapter(),
    successPayload: {
      output: [{ content: [{ type: "output_text", text: "Das 9 as 18h." }] }]
    }
  },
  {
    provider: "langgraph",
    adapter: new LangGraphAdapter(),
    successPayload: { messages: [{ role: "assistant", content: "Das 9 as 18h." }] }
  },
  {
    provider: "flowise",
    adapter: new FlowiseAdapter(),
    successPayload: { text: "Das 9 as 18h." }
  },
  {
    provider: "dify",
    adapter: new DifyAdapter(),
    successPayload: { answer: "Das 9 as 18h." }
  },
  {
    provider: "crewai",
    adapter: new CrewAiAdapter(),
    successPayload: { result: "Das 9 as 18h." }
  },
  {
    provider: "mcp",
    adapter: new McpServerAdapter(),
    successPayload: { result: { content: [{ type: "text", text: "Das 9 as 18h." }] } }
  },
  {
    provider: "custom",
    adapter: new CustomAgentAdapter(),
    successPayload: { content: { type: "text", text: "Das 9 as 18h." } }
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(CASES)("agent adapter contract ($provider)", ({ adapter, successPayload }) => {
  it("sends the request to the configured webhook and returns a valid MessageContent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successPayload)
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await adapter.send(buildRequest(), buildConfig(), buildWebhook());

    expect(fetchMock).toHaveBeenCalledWith(
      WEBHOOK_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect((init as { signal?: AbortSignal }).signal).toBeInstanceOf(AbortSignal);
    expect(response.content.type).toBeDefined();
  });

  it("throws a safe routing error when the provider responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    await expect(adapter.send(buildRequest(), buildConfig(), buildWebhook())).rejects.toThrow(
      AgentRoutingError,
    );

    try {
      await adapter.send(buildRequest(), buildConfig(), buildWebhook());
    } catch (error) {
      expect((error as Error).message).not.toContain(WEBHOOK_URL);
      expect((error as Error).message).not.toContain("secret-path");
    }
  });

  it("throws a safe routing error when the provider is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(adapter.send(buildRequest(), buildConfig(), buildWebhook())).rejects.toThrow(
      AgentRoutingError,
    );
  });

  it("requires a webhook endpoint", async () => {
    await expect(adapter.send(buildRequest(), buildConfig(), null)).rejects.toThrow(AgentRoutingError);
  });
});
