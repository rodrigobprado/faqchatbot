import type { AgentProvider, MessageContent } from "@faqchatbot/contracts";
import type { tenantAgentConfigs, webhookEndpoints } from "../../db/schema.js";

export type TenantAgentConfigRow = typeof tenantAgentConfigs.$inferSelect;
export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;

export type AgentRequest = {
  tenantId: string;
  conversationId: string;
  visitorId: string;
  message: MessageContent;
};

export type AgentResponse = {
  content: MessageContent;
  providerMessageId?: string;
};

export class AgentRoutingError extends Error {}

export interface AgentAdapter {
  readonly provider: AgentProvider;
  send(request: AgentRequest, config: TenantAgentConfigRow, webhook: WebhookEndpointRow | null): Promise<AgentResponse>;
}
