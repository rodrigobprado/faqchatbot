import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class FlowiseAdapter implements AgentAdapter {
  readonly provider = "flowise" as const;

  async send(
    request: AgentRequest,
    config: TenantAgentConfigRow,
    webhook: WebhookEndpointRow | null,
  ): Promise<AgentResponse> {
    const url = requireWebhookUrl(webhook?.url);

    const payload = await postJson({
      url,
      headers: webhook ? { Authorization: `Bearer ${webhook.secretRef}` } : {},
      body: {
        question: extractMessageText(request.message),
        overrideConfig: {
          tenantId: request.tenantId,
          conversationId: request.conversationId
        }
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["text", "data.text", "message"]);
    return { content: normalizeAssistantText(text) };
  }
}
