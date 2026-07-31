import type { MessageContent } from "@faqchatbot/contracts";
import { describe, expect, it } from "vitest";
import { sanitizeMessageContent } from "./markdown-sanitizer.js";

describe("sanitizeMessageContent", () => {
  it("strips script tags from markdown content", () => {
    const content: MessageContent = {
      type: "markdown",
      markdown: 'Ola <script>alert("xss")</script> **mundo**'
    };

    const sanitized = sanitizeMessageContent(content);

    expect(sanitized).toEqual({ type: "markdown", markdown: "Ola  **mundo**" });
  });

  it("strips html tags from plain text content", () => {
    const content: MessageContent = { type: "text", text: '<img src=x onerror="alert(1)">Ola' };

    const sanitized = sanitizeMessageContent(content);

    expect(sanitized).toEqual({ type: "text", text: "Ola" });
  });

  it("leaves non-text rich content untouched", () => {
    const content: MessageContent = {
      type: "card",
      title: "Plano Premium",
      buttons: []
    };

    expect(sanitizeMessageContent(content)).toEqual(content);
  });
});
