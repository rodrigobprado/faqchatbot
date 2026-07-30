import { describe, expect, it } from "vitest";
import { chatMessageSchema } from "./messages.js";

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
});
