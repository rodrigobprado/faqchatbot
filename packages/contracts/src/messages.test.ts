import { describe, expect, it } from "vitest";
import {
  chatMessageCreateRequestSchema,
  chatMessageExchangeResponseSchema,
  chatMessageHistoryResponseSchema,
  chatMessageSchema
} from "./messages.js";

const conversationId = "00000000-0000-4000-8000-000000000001";

describe("chatMessageSchema", () => {
  it("accepts a text message", () => {
    const message = chatMessageSchema.parse({
      conversationId,
      role: "user",
      content: {
        type: "text",
        text: "Ola"
      }
    });

    expect(message.content.type).toBe("text");
  });

  it("accepts a card message with buttons", () => {
    const message = chatMessageSchema.parse({
      conversationId,
      role: "assistant",
      content: {
        type: "card",
        title: "Plano Premium",
        description: "R$99/mes",
        buttons: [{ id: "buy", label: "Comprar" }]
      }
    });

    expect(message.content.type).toBe("card");
  });

  it("rejects empty text messages", () => {
    expect(() =>
      chatMessageSchema.parse({
        conversationId,
        role: "user",
        content: {
          type: "text",
          text: ""
        }
      }),
    ).toThrow();
  });

  it("accepts http media URLs", () => {
    const message = chatMessageSchema.parse({
      conversationId,
      role: "assistant",
      content: {
        type: "image",
        url: "https://cdn.example.com/image.png"
      }
    });

    expect(message.content.type).toBe("image");
  });

  it("rejects non-http media URLs", () => {
    expect(() =>
      chatMessageSchema.parse({
        conversationId,
        role: "assistant",
        content: {
          type: "image",
          url: "javascript:alert(1)"
        }
      }),
    ).toThrow();
  });

  it("rejects malformed media URLs", () => {
    expect(() =>
      chatMessageSchema.parse({
        conversationId,
        role: "assistant",
        content: {
          type: "image",
          url: "not-a-url"
        }
      }),
    ).toThrow();
  });

  it("accepts chat message exchange payloads", () => {
    const response = chatMessageExchangeResponseSchema.parse({
      conversationId,
      userMessage: {
        conversationId,
        role: "user",
        content: {
          type: "text",
          text: "Ola"
        }
      },
      assistantMessage: {
        conversationId,
        role: "assistant",
        content: {
          type: "text",
          text: "Tudo bem"
        }
      }
    });

    expect(response.userMessage.content.type).toBe("text");
  });

  it("accepts chat message history payloads and request payloads", () => {
    const history = chatMessageHistoryResponseSchema.parse({
      conversationId,
      messages: [
        {
          conversationId,
          role: "user",
          content: {
            type: "text",
            text: "Ola"
          }
        }
      ]
    });
    const request = chatMessageCreateRequestSchema.parse({
      content: {
        type: "text",
        text: "Ola"
      }
    });

    expect(history.messages).toHaveLength(1);
    expect(request.content.type).toBe("text");
  });
});
