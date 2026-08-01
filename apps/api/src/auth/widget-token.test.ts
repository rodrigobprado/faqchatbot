import { describe, expect, it } from "vitest";
import {
  createWidgetAccessToken,
  decodeWidgetAccessToken,
  resolveWidgetTokenSecret
} from "./widget-token.js";

describe("widget-token", () => {
  it("creates and decodes widget tokens", () => {
    const secret = "widget-secret";
    const token = createWidgetAccessToken(
      {
        scope: "widget",
        tenantId: "11111111-1111-4111-8111-111111111111",
        visitorId: "22222222-2222-4222-8222-222222222222",
        sessionId: "33333333-3333-4333-8333-333333333333",
        conversationId: "44444444-4444-4444-8444-444444444444",
        issuedAt: 1,
        expiresAt: 2
      },
      secret,
    );

    expect(decodeWidgetAccessToken(token, secret)).toMatchObject({
      scope: "widget",
      visitorId: "22222222-2222-4222-8222-222222222222"
    });
  });

  it("rejects malformed widget tokens", () => {
    expect(() => decodeWidgetAccessToken("malformed", "secret")).toThrow("Invalid token");
  });

  it("resolves widget token secrets from env and production rules", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.JWT_WIDGET_SECRET;

    try {
      process.env.NODE_ENV = "test";
      process.env.JWT_WIDGET_SECRET = "from-env";
      expect(resolveWidgetTokenSecret()).toBe("from-env");

      process.env.NODE_ENV = "production";
      delete process.env.JWT_WIDGET_SECRET;
      expect(() => resolveWidgetTokenSecret()).toThrow("JWT_WIDGET_SECRET is required in production");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.JWT_WIDGET_SECRET = previousSecret;
    }
  });
});
