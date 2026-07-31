import { describe, expect, it } from "vitest";
import { sendMessageRequestSchema } from "./chat.js";

const conversationId = "00000000-0000-4000-8000-000000000001";

describe("sendMessageRequestSchema", () => {
  it("accepts a text message for a conversation", () => {
    const parsed = sendMessageRequestSchema.parse({
      conversationId,
      content: { type: "text", text: "Ola" }
    });

    expect(parsed.content.type).toBe("text");
  });

  it("rejects a request without a conversationId", () => {
    expect(() =>
      sendMessageRequestSchema.parse({ content: { type: "text", text: "Ola" } }),
    ).toThrow();
  });

  it("rejects malformed rich content", () => {
    expect(() =>
      sendMessageRequestSchema.parse({
        conversationId,
        content: { type: "card", title: "" }
      }),
    ).toThrow();
  });
});
