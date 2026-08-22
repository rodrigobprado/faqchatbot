import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class LangGraphAdapter implements AgentAdapter {
  readonly provider = "langgraph" as const;

  async send(
    request: AgentRequest,
    config: TenantAgentConfigRow,
    webhook: WebhookEndpointRow | null,
  ): Promise<AgentResponse> {
    const url = requireWebhookUrl(webhook?.url);

    const payload = await postJson({
      url,
      headers: webhook ? { "X-API-Key": webhook.secretRef } : {},
      body: {
        input: {
          messages: [{ role: "user", content: extractMessageText(request.message) }]
        },
        config: {
          configurable: {
            tenantId: request.tenantId,
            conversationId: request.conversationId
          }
        }
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["messages", "output.messages", "output"]);
    return { content: normalizeAssistantText(text) };
  }
}
