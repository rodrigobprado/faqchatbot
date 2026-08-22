import type { AgentAdapter, AgentRequest, AgentResponse, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { extractMessageText, normalizeAssistantText, pickResponseText, postJson, requireWebhookUrl } from "./adapter-support.js";

export class McpServerAdapter implements AgentAdapter {
  readonly provider = "mcp" as const;

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
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: config.model ?? "chat",
          arguments: {
            message: extractMessageText(request.message),
            tenantId: request.tenantId,
            conversationId: request.conversationId,
            visitorId: request.visitorId
          }
        }
      },
      timeoutMs: config.timeoutMs
    });

    const text = pickResponseText(payload, ["result.content", "result.text", "content"]);
    return { content: normalizeAssistantText(text) };
  }
}
