import { describe, expect, it } from "vitest";
import { AgentRoutingError } from "./agent-adapter.js";
import {
  extractMessageText,
  normalizeAssistantText,
  pickResponseText,
  requireWebhookUrl
} from "./adapter-support.js";

describe("extractMessageText", () => {
  it("flattens text and markdown content", () => {
    expect(extractMessageText({ type: "text", text: "Ola" })).toBe("Ola");
    expect(extractMessageText({ type: "markdown", markdown: "# Titulo" })).toBe("# Titulo");
  });

  it("replaces rich types with a placeholder", () => {
    expect(extractMessageText({ type: "card", title: "Promo", buttons: [] })).toBe("[card]");
  });
});

describe("requireWebhookUrl", () => {
  it("returns the url when present", () => {
    expect(requireWebhookUrl("https://hooks.example.com")).toBe("https://hooks.example.com");
  });

  it("throws a routing error without leaking values when missing", () => {
    expect(() => requireWebhookUrl(null)).toThrow(AgentRoutingError);
    expect(() => requireWebhookUrl(null)).toThrow("No webhook configured for this tenant");
  });
});

describe("normalizeAssistantText", () => {
  it("produces text for plain responses", () => {
    expect(normalizeAssistantText("  Ola! ")).toEqual({ type: "text", text: "Ola!" });
  });

  it("produces markdown when markers are present", () => {
    const result = normalizeAssistantText("# Titulo\n- item");
    expect(result.type).toBe("markdown");
  });

  it("rejects empty responses", () => {
    expect(() => normalizeAssistantText("   ")).toThrow(AgentRoutingError);
  });
});

describe("pickResponseText", () => {
  it("resolves dotted paths", () => {
    const payload = { answer: { text: "Resposta" } };
    expect(pickResponseText(payload, ["answer.text", "fallback"])).toBe("Resposta");
  });

  it("joins arrays of text fragments", () => {
    const payload = {
      output: [{ content: [{ type: "output_text", text: "Ola" }] }, { content: [{ text: " mundo" }] }]
    };

    expect(pickResponseText(payload, ["output"])).toBe("Ola mundo");
  });

  it("falls through to later paths", () => {
    expect(pickResponseText({ b: "segunda" }, ["a", "b"])).toBe("segunda");
  });

  it("throws when no path matches", () => {
    expect(() => pickResponseText({}, ["a"])).toThrow(AgentRoutingError);
  });
});
