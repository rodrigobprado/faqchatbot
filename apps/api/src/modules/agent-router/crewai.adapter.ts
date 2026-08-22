import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class CrewAiAdapter implements AgentAdapter {
  readonly provider = "crewai" as const;

  async send(
    request: AgentRequest,
    config: TenantAgentConfigRow,
    webhook: WebhookEndpointRow | null,
  ): Promise<AgentResponse> {
    const url = requireWebhookUrl(webhook?.url);
    const message = extractMessageText(request.message);

    const payload = await postJson({
      url,
      headers: webhook ? { Authorization: `Bearer ${webhook.secretRef}` } : {},
      body: {
        task: message,
        inputs: {
          message,
          tenantId: request.tenantId,
          conversationId: request.conversationId,
          visitorId: request.visitorId
        }
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["result", "output", "final_answer", "raw"]);
    return { content: normalizeAssistantText(text) };
  }
}
