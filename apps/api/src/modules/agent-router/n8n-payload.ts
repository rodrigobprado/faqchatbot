import type { MessageContent } from "@faqchatbot/contracts";
import { AgentRoutingError, type AgentRequest } from "./agent-adapter.js";

export type N8nWebhookRequest = {
  tenantId: string;
  conversationId: string;
  visitorId: string;
  message: string;
};

const extractMessageText = (content: MessageContent): string => {
  if (content.type === "text") {
    return content.text;
  }
  if (content.type === "markdown") {
    return content.markdown;
  }
  return `[${content.type}]`;
};

export const normalizeN8nRequest = (request: AgentRequest): N8nWebhookRequest => ({
  tenantId: request.tenantId,
  conversationId: request.conversationId,
  visitorId: request.visitorId,
  message: extractMessageText(request.message)
});

export const normalizeN8nResponse = (payload: unknown): MessageContent => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "text" in payload &&
    typeof (payload as { text: unknown }).text === "string"
  ) {
    return { type: "text", text: (payload as { text: string }).text };
  }

  throw new AgentRoutingError("Unexpected response shape from agent provider");
};
