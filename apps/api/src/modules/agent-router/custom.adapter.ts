import { messageContentSchema, type MessageContent } from "@faqchatbot/contracts";
import {
  AgentRoutingError,
  type AgentAdapter,
  type AgentRequest,
  type AgentResponse,
  type TenantAgentConfigRow,
  type WebhookEndpointRow
} from "./agent-adapter.js";
import { postJson, requireWebhookUrl } from "./adapter-support.js";

export type CustomAgentRequestPayload = {
  tenantId: string;
  conversationId: string;
  visitorId: string;
  message: MessageContent;
};

export class CustomAgentAdapter implements AgentAdapter {
  readonly provider = "custom" as const;

  async send(
    request: AgentRequest,
    config: TenantAgentConfigRow,
    webhook: WebhookEndpointRow | null,
  ): Promise<AgentResponse> {
    const url = requireWebhookUrl(webhook?.url);

    const payload: CustomAgentRequestPayload = {
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      visitorId: request.visitorId,
      message: request.message
    };

    const response = await postJson({
      url,
      headers: webhook ? { "X-Webhook-Secret": webhook.secretRef } : {},
      body: payload,
      timeoutMs: config.timeoutMs
    });

    return this.normalizeResponse(response);
  }

  private normalizeResponse(response: unknown): AgentResponse {
    if (typeof response !== "object" || response === null || !("content" in response)) {
      throw new AgentRoutingError("Unexpected response shape from agent provider");
    }

    const parsed = messageContentSchema.safeParse((response as { content: unknown }).content);
    if (!parsed.success) {
      throw new AgentRoutingError("Unexpected response shape from agent provider");
    }

    return { content: parsed.data };
  }
}
