import { describe, expect, it } from "vitest";
import { widgetEventNameSchema } from "./widget-events.js";

describe("widgetEventNameSchema", () => {
  it("accepts supported public widget events", () => {
    expect(widgetEventNameSchema.parse("onOpen")).toBe("onOpen");
    expect(widgetEventNameSchema.parse("onConversationEnd")).toBe("onConversationEnd");
  });

  it("rejects unknown events", () => {
    expect(() => widgetEventNameSchema.parse("onWebhookExposed")).toThrow();
  });
});

