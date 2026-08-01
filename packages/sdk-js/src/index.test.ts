import { describe, expect, it } from "vitest";
import { buildWidgetScriptUrl, buildWidgetSnippet } from "./index.js";

describe("sdk-js", () => {
  it("builds a widget script url with the agent id", () => {
    const url = buildWidgetScriptUrl({
      src: "https://cdn.example.com/widget.js",
      agentId: "empresa123"
    });

    expect(url).toBe("https://cdn.example.com/widget.js?data-agent=empresa123");
  });

  it("builds a safe widget script snippet", () => {
    const snippet = buildWidgetSnippet({
      src: "https://cdn.example.com/widget.js",
      agentId: "empresa123",
      nonce: 'abc"123',
      attributes: { crossorigin: "anonymous" }
    });

    expect(snippet).toContain('src="https://cdn.example.com/widget.js?data-agent=empresa123"');
    expect(snippet).toContain('data-agent="empresa123"');
    expect(snippet).toContain('nonce="abc&quot;123"');
    expect(snippet).toContain('crossorigin="anonymous"');
  });

  it("supports optional attributes being omitted", () => {
    const snippet = buildWidgetSnippet({
      src: "https://cdn.example.com/widget.js",
      agentId: "empresa123",
      async: false
    });

    expect(snippet).toBe(
      '<script src="https://cdn.example.com/widget.js?data-agent=empresa123" data-agent="empresa123"></script>',
    );
  });
});
