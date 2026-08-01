import { randomUUID } from "node:crypto";
import type { AgentAdapter, AgentRouteInput, AgentRouteResult } from "./agent-adapter.js";

const describeIncomingMessage = (message: Readonly<Record<string, unknown>>): string => {
  const type = typeof message.type === "string" ? message.type : "unknown";

  if (type === "text") {
    const text = typeof message.text === "string" ? message.text.trim() : "";
    return text ? `Recebi: ${text}` : "Mensagem recebida.";
  }

  if (type === "markdown") {
    return "Recebi seu conteúdo em markdown.";
  }

  if (type === "card") {
    const title = typeof message.title === "string" ? message.title.trim() : "";
    return title ? `Recebi seu card: ${title}` : "Recebi seu card.";
  }

  return "Mensagem recebida.";
};

export class N8nAgentAdapter implements AgentAdapter {
  readonly provider = "n8n" as const;

  async route(input: AgentRouteInput): Promise<AgentRouteResult> {
    const model =
      typeof input.agentConfig?.model === "string" && input.agentConfig.model.trim()
        ? input.agentConfig.model
        : null;

    return {
      provider: this.provider,
      model,
      providerMessageId: randomUUID(),
      content: {
        type: "text",
        text: describeIncomingMessage(input.message)
      },
      metadata: {
        provider: this.provider,
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        routedBy: "agent-router"
      }
    };
  }
}
