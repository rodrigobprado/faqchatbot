import { describe, expect, it } from "vitest";
import { widgetSessionStartRequestSchema } from "./sessions.js";

describe("widgetSessionStartRequestSchema", () => {
  it("accepts a valid session start request", () => {
    const request = widgetSessionStartRequestSchema.parse({
      agentId: "empresa123",
      context: {
        url: "https://example.com/pricing",
        title: "Pricing",
        language: "pt-BR",
        referrer: "",
        viewport: { width: 1440, height: 900 },
        timestamp: "2026-07-30T12:00:00.000Z"
      }
    });

    expect(request.agentId).toBe("empresa123");
    expect(request.context.utm).toEqual({});
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      widgetSessionStartRequestSchema.parse({
        agentId: "empresa123",
        context: {
          url: "javascript:alert(1)",
          viewport: { width: 1440, height: 900 },
          timestamp: "2026-07-30T12:00:00.000Z"
        }
      }),
    ).toThrow();
  });
});

