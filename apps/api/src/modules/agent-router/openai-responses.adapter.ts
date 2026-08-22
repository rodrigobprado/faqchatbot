import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class OpenAiResponsesAdapter implements AgentAdapter {
  readonly provider = "openai_responses" as const;

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
        model: config.model ?? "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: extractMessageText(request.message) }]
          }
        ],
        metadata: {
          tenantId: request.tenantId,
          conversationId: request.conversationId
        }
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["output_text", "output", "choices.0.message.content"]);
    return { content: normalizeAssistantText(text) };
  }
}
