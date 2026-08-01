import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createWidgetAccessToken } from "../../auth/widget-token.js";
import { WidgetAuthGuard } from "./widget-auth.guard.js";

describe("WidgetAuthGuard", () => {
  it("accepts valid widget tokens", () => {
    const previousSecret = process.env.JWT_WIDGET_SECRET;
    const secret = "widget-secret";
    process.env.JWT_WIDGET_SECRET = secret;

    try {
      const guard = new WidgetAuthGuard();
      const token = createWidgetAccessToken(
        {
          scope: "widget",
          tenantId: randomUUID(),
          visitorId: randomUUID(),
          sessionId: randomUUID(),
          conversationId: randomUUID(),
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 60
        },
        secret,
      );
      const request = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const allowed = guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => request
        })
      } as never);

      expect(allowed).toBe(true);
      expect(request.widgetUser?.scope).toBe("widget");
    } finally {
      process.env.JWT_WIDGET_SECRET = previousSecret;
    }
  });

  it("rejects missing, expired and malformed widget tokens", () => {
    const previousSecret = process.env.JWT_WIDGET_SECRET;
    const secret = "widget-secret";
    process.env.JWT_WIDGET_SECRET = secret;

    try {
      const guard = new WidgetAuthGuard();
      const expiredToken = createWidgetAccessToken(
        {
          scope: "widget",
          tenantId: randomUUID(),
          visitorId: randomUUID(),
          sessionId: randomUUID(),
          conversationId: randomUUID(),
          issuedAt: 1,
          expiresAt: 1
        },
        secret,
      );

      expect(() =>
        guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => ({ headers: {} })
          })
        } as never),
      ).toThrow("Missing widget access token");

      expect(() =>
        guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => ({
              headers: {
                authorization: `Bearer ${expiredToken}`
              }
            })
          })
        } as never),
      ).toThrow("Invalid widget access token");

      expect(() =>
        guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => ({
              headers: {
                authorization: "Bearer malformed.token"
              }
            })
          })
        } as never),
      ).toThrow("Invalid widget access token");

      const wrongScopeToken = createWidgetAccessToken(
        {
          scope: "admin" as never,
          tenantId: randomUUID(),
          visitorId: randomUUID(),
          sessionId: randomUUID(),
          conversationId: randomUUID(),
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 60
        },
        secret,
      );

      expect(() =>
        guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => ({
              headers: {
                authorization: `Bearer ${wrongScopeToken}`
              }
            })
          })
        } as never),
      ).toThrow("Invalid widget access token");
    } finally {
      process.env.JWT_WIDGET_SECRET = previousSecret;
    }
  });
});
