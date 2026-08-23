import {
  AgentRoutingError,
  type AgentAdapter,
  type AgentRequest,
  type AgentResponse,
  type TenantAgentConfigRow,
  type WebhookEndpointRow
} from "./agent-adapter.js";
import { normalizeN8nRequest, normalizeN8nResponse } from "./n8n-payload.js";

export class N8nAgentAdapter implements AgentAdapter {
  readonly provider = "n8n" as const;

  async send(
    request: AgentRequest,
    config: TenantAgentConfigRow,
    webhook: WebhookEndpointRow | null,
  ): Promise<AgentResponse> {
    if (!webhook) {
      throw new AgentRoutingError("No webhook configured for this tenant");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhook.secretRef
        },
        body: JSON.stringify(normalizeN8nRequest(request)),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new AgentRoutingError(`n8n webhook responded with status ${response.status}`);
      }

      return { content: normalizeN8nResponse(await response.json()) };
    } catch (error) {
      if (error instanceof AgentRoutingError) {
        throw error;
      }
      throw new AgentRoutingError("Failed to reach the n8n webhook");
    } finally {
      clearTimeout(timeout);
    }
  }
}
