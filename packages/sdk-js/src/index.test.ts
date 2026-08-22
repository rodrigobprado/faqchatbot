import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWidgetScriptUrl,
  buildWidgetSnippet,
  loadChatWidget,
  widgetScriptUrl,
  type ChatWidgetPublicApi
} from "./index.js";

const fakeApi: ChatWidgetPublicApi = {
  open: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  send: () => undefined,
  identify: () => undefined,
  setTheme: () => undefined,
  destroy: () => undefined
};

const setupDocument = () => {
  const doc = document.implementation.createHTMLDocument("sdk-test");
  const originalAppend = doc.head.appendChild.bind(doc.head);
  vi.spyOn(doc.head, "appendChild").mockImplementation((node) => {
    const appended = originalAppend(node);
    queueMicrotask(() => (node as HTMLScriptElement).dispatchEvent(new Event("load")));
    return appended;
  });
  return doc;
};

const baseOptions = { agentId: "demo", apiUrl: "https://api.example.com" };

afterEach(() => {
  delete (window as { ChatWidget?: ChatWidgetPublicApi }).ChatWidget;
  vi.restoreAllMocks();
});

describe("widgetScriptUrl", () => {
  it("resolves widget.js against the API origin", () => {
    expect(widgetScriptUrl("https://api.example.com")).toBe("https://api.example.com/widget.js");
  });
});

describe("loadChatWidget", () => {
  it("injects the loader script with agent and api attributes and resolves the public API", async () => {
    const doc = setupDocument();
    const windowRef = window as Window & { ChatWidget?: ChatWidgetPublicApi };

    const pending = loadChatWidget({ ...baseOptions, documentRef: doc, windowRef });
    windowRef.ChatWidget = fakeApi;

    await expect(pending).resolves.toBe(fakeApi);

    const script = doc.querySelector("script[data-faqchatbot-loader]");
    expect(script?.getAttribute("src")).toBe("https://api.example.com/widget.js");
    expect(script?.getAttribute("data-agent")).toBe("demo");
    expect(script?.getAttribute("data-api-url")).toBe("https://api.example.com");
  });

  it("supports a custom scriptUrl", async () => {
    const doc = setupDocument();
    const windowRef = window as Window & { ChatWidget?: ChatWidgetPublicApi };

    const pending = loadChatWidget({
      ...baseOptions,
      scriptUrl: "https://cdn.example.com/widget.abc123.js",
      documentRef: doc,
      windowRef
    });
    windowRef.ChatWidget = fakeApi;

    await pending;

    expect(doc.querySelector("script[data-faqchatbot-loader]")?.getAttribute("src")).toBe(
      "https://cdn.example.com/widget.abc123.js",
    );
  });

  it("returns the existing API without injecting a second script when already loaded", async () => {
    const doc = setupDocument();
    const windowRef = window as Window & { ChatWidget?: ChatWidgetPublicApi };
    windowRef.ChatWidget = fakeApi;

    const result = await loadChatWidget({ ...baseOptions, documentRef: doc, windowRef });

    expect(result).toBe(fakeApi);
    expect(doc.querySelector("script[data-faqchatbot-loader]")).toBeNull();
  });

  it("rejects when the script fails to load", async () => {
    const doc = document.implementation.createHTMLDocument("sdk-fail");
    const originalAppend = doc.head.appendChild.bind(doc.head);
    vi.spyOn(doc.head, "appendChild").mockImplementation((node) => {
      const appended = originalAppend(node);
      queueMicrotask(() => (node as HTMLScriptElement).dispatchEvent(new Event("error")));
      return appended;
    });

    await expect(loadChatWidget({ ...baseOptions, documentRef: doc, windowRef: window })).rejects.toThrow(
      "Failed to load chat widget script",
    );
    expect(doc.querySelector("script[data-faqchatbot-loader]")).not.toBeNull();
  });

  it("rejects when the script loads but the public API is missing", async () => {
    const doc = setupDocument();

    await expect(loadChatWidget({ ...baseOptions, documentRef: doc, windowRef: window })).rejects.toThrow(
      "public API is unavailable",
    );
  });

  it("requires an agentId", async () => {
    await expect(loadChatWidget({ ...baseOptions, agentId: "", documentRef: setupDocument() })).rejects.toThrow(
      "requires an agentId",
    );
  });

  it("refuses a second concurrent load while the first is in flight", async () => {
    const doc = document.implementation.createHTMLDocument("sdk-concurrent");
    const originalAppend = doc.head.appendChild.bind(doc.head);
    let fireLoad: () => void = () => undefined;
    vi.spyOn(doc.head, "appendChild").mockImplementation((node) => {
      const appended = originalAppend(node);
      fireLoad = () => (node as HTMLScriptElement).dispatchEvent(new Event("load"));
      return appended;
    });

    const first = loadChatWidget({ ...baseOptions, documentRef: doc, windowRef: window });
    const second = loadChatWidget({ ...baseOptions, documentRef: doc, windowRef: window });

    await expect(second).rejects.toThrow("already being loaded");

    (window as Window & { ChatWidget?: ChatWidgetPublicApi }).ChatWidget = fakeApi;
    fireLoad();

    await expect(first).resolves.toBe(fakeApi);
  });
});

describe("buildWidgetScriptUrl", () => {
  it("builds a widget script url with the agent id", () => {
    const url = buildWidgetScriptUrl({
      src: "https://cdn.example.com/widget.js",
      agentId: "empresa123"
    });

    expect(url).toBe("https://cdn.example.com/widget.js?data-agent=empresa123");
  });
});

describe("buildWidgetSnippet", () => {
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
