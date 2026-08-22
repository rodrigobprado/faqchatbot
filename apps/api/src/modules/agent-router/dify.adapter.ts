import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class DifyAdapter implements AgentAdapter {
  readonly provider = "dify" as const;

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
        inputs: {},
        query: extractMessageText(request.message),
        response_mode: "blocking",
        user: request.visitorId,
        conversation_id: request.conversationId
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["answer", "data.answer", "message"]);
    return { content: normalizeAssistantText(text) };
  }
}
