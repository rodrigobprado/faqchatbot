import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { describe, expect, it, vi } from "vitest";
import type { WidgetTokenClaims } from "../access-token-claims.js";
import { WidgetJwtGuard, type AuthenticatedWidgetRequest } from "./widget-jwt.guard.js";

const env = { JWT_WIDGET_SECRET: "widget-secret" } as PlatformEnvironment;

const createContext = (request: Partial<AuthenticatedWidgetRequest>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request })
  }) as unknown as ExecutionContext;

describe("WidgetJwtGuard", () => {
  it("attaches the decoded claims to the request and allows the call", async () => {
    const claims: WidgetTokenClaims = {
      sub: "visitor-1",
      tenantId: "tenant-1",
      sessionId: "session-1",
      conversationId: "conversation-1",
      scope: "widget"
    };
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue(claims) } as unknown as JwtService;
    const guard = new WidgetJwtGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer valid-token" } } as AuthenticatedWidgetRequest;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(claims);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid-token", { secret: "widget-secret" });
  });

  it("rejects a request without an Authorization header", async () => {
    const jwtService = { verifyAsync: vi.fn() } as unknown as JwtService;
    const guard = new WidgetJwtGuard(env, jwtService);
    const request = { headers: {} } as AuthenticatedWidgetRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an invalid or expired token", async () => {
    const jwtService = { verifyAsync: vi.fn().mockRejectedValue(new Error("expired")) } as unknown as JwtService;
    const guard = new WidgetJwtGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer expired-token" } } as AuthenticatedWidgetRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token with the wrong scope", async () => {
    const claims = {
      sub: "user-1",
      tenantId: "tenant-1",
      roles: [],
      permissions: [],
      scope: "admin"
    };
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue(claims) } as unknown as JwtService;
    const guard = new WidgetJwtGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer admin-token" } } as AuthenticatedWidgetRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
