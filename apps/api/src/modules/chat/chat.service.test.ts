import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { WidgetAccessTokenPayload } from "../../auth/widget-token.js";
import { ChatService } from "./chat.service.js";

const createActor = (): WidgetAccessTokenPayload => ({
  scope: "widget",
  tenantId: randomUUID(),
  visitorId: randomUUID(),
  sessionId: randomUUID(),
  conversationId: randomUUID(),
  issuedAt: 1,
  expiresAt: 2
});

const createService = () => {
  const dependencies = {
    conversations: {
      findById: vi.fn()
    },
    agentRouter: {
      route: vi.fn()
    },
    messages: {
      create: vi.fn(),
      listByConversationId: vi.fn()
    }
  } as const;

  return { service: new ChatService(dependencies), dependencies };
};

describe("ChatService", () => {
  it("stores an exchange and returns both messages", async () => {
    const { service, dependencies } = createService();
    const actor = createActor();
    const conversation = {
      id: actor.conversationId,
      tenantId: actor.tenantId,
      sessionId: actor.sessionId,
      status: "open" as const
    };

    dependencies.conversations.findById.mockResolvedValue(conversation);
    dependencies.agentRouter.route.mockResolvedValue({
      provider: "n8n",
      model: null,
      providerMessageId: "n8n-message-1",
      content: {
        type: "text",
        text: "Recebi: Ola"
      },
      metadata: {
        provider: "n8n"
      }
    });
    dependencies.messages.create
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "user",
        type: "text",
        content: {
          type: "text",
          text: "Ola"
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z")
      })
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "assistant",
        type: "text",
        content: {
          type: "text",
          text: "Recebi: Ola"
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:01.000Z")
      });

    const response = await service.sendMessage(actor, {
      content: {
        type: "text",
        text: "Ola"
      }
    });

    expect(response.conversationId).toBe(actor.conversationId);
    expect(response.userMessage.role).toBe("user");
    expect(response.assistantMessage.role).toBe("assistant");
    expect(dependencies.agentRouter.route).toHaveBeenCalledWith({
      tenantId: actor.tenantId,
      conversationId: actor.conversationId,
      message: {
        type: "text",
        text: "Ola"
      }
    });
    expect(dependencies.messages.create).toHaveBeenCalledTimes(2);
  });

  it("returns history and SSE frames", async () => {
    const { service, dependencies } = createService();
    const actor = createActor();

    dependencies.conversations.findById.mockResolvedValue({
      id: actor.conversationId,
      tenantId: actor.tenantId,
      sessionId: actor.sessionId,
      status: "open"
    });
    dependencies.agentRouter.route.mockResolvedValue({
      provider: "n8n",
      model: null,
      providerMessageId: "n8n-message-2",
      content: {
        type: "text",
        text: "Recebi: Ola"
      },
      metadata: {
        provider: "n8n"
      }
    });
    dependencies.messages.listByConversationId.mockResolvedValue([
      {
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "user",
        type: "text",
        content: {
          type: "text",
          text: "Ola"
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z")
      }
    ]);

    const history = await service.getHistory(actor, actor.conversationId);
    const stream = await service.buildStream(actor, actor.conversationId);

    expect(history.messages).toHaveLength(1);
    expect(stream).toContain("event: message");
    expect(stream).toContain("event: done");
  });

  it("handles markdown and rich content inputs", async () => {
    const { service, dependencies } = createService();
    const actor = createActor();

    dependencies.conversations.findById.mockResolvedValue({
      id: actor.conversationId,
      tenantId: actor.tenantId,
      sessionId: actor.sessionId,
      status: "open"
    });
    dependencies.agentRouter.route.mockResolvedValue({
      provider: "n8n",
      model: null,
      providerMessageId: "n8n-message-3",
      content: {
        type: "text",
        text: "Recebi seu conteúdo em markdown."
      },
      metadata: {
        provider: "n8n"
      }
    });
    dependencies.messages.create
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "user",
        type: "markdown",
        content: {
          type: "markdown",
          markdown: "**Ola**"
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z")
      })
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "assistant",
        type: "text",
        content: {
          type: "text",
          text: "Recebi seu conteúdo em markdown."
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:01.000Z")
      })
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "user",
        type: "card",
        content: {
          type: "card",
          title: "Plano"
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:02.000Z")
      })
      .mockResolvedValueOnce({
        id: randomUUID(),
        tenantId: actor.tenantId,
        conversationId: actor.conversationId,
        role: "assistant",
        type: "text",
        content: {
          type: "text",
          text: "Mensagem recebida."
        },
        metadata: {},
        providerMessageId: null,
        createdAt: new Date("2026-08-01T00:00:03.000Z")
      });

    const markdownResponse = await service.sendMessage(actor, {
      content: {
        type: "markdown",
        markdown: "**Ola**"
      }
    });
    const cardResponse = await service.sendMessage(actor, {
      content: {
        type: "card",
        title: "Plano"
      }
    });

    expect(markdownResponse.assistantMessage.content.type).toBe("text");
    expect(cardResponse.assistantMessage.content.type).toBe("text");
  });

  it("rejects unauthorized conversation access and invalid payloads", async () => {
    const { service, dependencies } = createService();
    const actor = createActor();

    dependencies.conversations.findById.mockResolvedValue({
      id: actor.conversationId,
      tenantId: randomUUID(),
      sessionId: actor.sessionId,
      status: "open"
    });

    await expect(
      service.getHistory(actor, actor.conversationId),
    ).rejects.toThrow("Conversation access denied");

    dependencies.conversations.findById.mockResolvedValue(null);
    await expect(service.getHistory(actor, actor.conversationId)).rejects.toThrow(
      `Conversation ${actor.conversationId} was not found`,
    );

    dependencies.conversations.findById.mockResolvedValue({
      id: actor.conversationId,
      tenantId: actor.tenantId,
      sessionId: actor.sessionId,
      status: "closed"
    });

    await expect(
      service.sendMessage(actor, { content: { type: "text", text: "Ola" } }),
    ).rejects.toThrow("Conversation is closed");

    await expect(service.sendMessage(actor, { content: { type: "text", text: "" } })).rejects.toThrow(
      "Invalid chat message payload",
    );
  });
});
