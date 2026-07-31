import { describe, expect, it } from "vitest";
import type { AgentRequest } from "./agent-adapter.js";
import { normalizeN8nRequest, normalizeN8nResponse } from "./n8n-payload.js";

const baseRequest: AgentRequest = {
  tenantId: "tenant-1",
  conversationId: "conversation-1",
  visitorId: "visitor-1",
  message: { type: "text", text: "Ola" }
};

describe("normalizeN8nRequest", () => {
  it("extracts the plain text from a text message", () => {
    expect(normalizeN8nRequest(baseRequest).message).toBe("Ola");
  });

  it("extracts the raw markdown from a markdown message", () => {
    const request: AgentRequest = { ...baseRequest, message: { type: "markdown", markdown: "**Ola**" } };

    expect(normalizeN8nRequest(request).message).toBe("**Ola**");
  });

  it("falls back to a bracketed type label for rich content", () => {
    const request: AgentRequest = {
      ...baseRequest,
      message: { type: "card", title: "Plano", buttons: [] }
    };

    expect(normalizeN8nRequest(request).message).toBe("[card]");
  });
});

describe("normalizeN8nResponse", () => {
  it("wraps a { text } payload into a text message", () => {
    expect(normalizeN8nResponse({ text: "Oi, tudo bem?" })).toEqual({
      type: "text",
      text: "Oi, tudo bem?"
    });
  });

  it("throws for a payload without a text field", () => {
    expect(() => normalizeN8nResponse({ reply: "Oi" })).toThrow();
  });

  it("throws for a non-object payload", () => {
    expect(() => normalizeN8nResponse("Oi")).toThrow();
  });
});
