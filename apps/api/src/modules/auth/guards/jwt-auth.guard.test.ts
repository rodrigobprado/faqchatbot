import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { describe, expect, it, vi } from "vitest";
import type { AccessTokenClaims } from "../access-token-claims.js";
import { JwtAuthGuard, type AuthenticatedRequest } from "./jwt-auth.guard.js";

const env = { JWT_ACCESS_SECRET: "access-secret" } as PlatformEnvironment;

const createContext = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request })
  }) as unknown as ExecutionContext;

describe("JwtAuthGuard", () => {
  it("attaches the decoded claims to the request and allows the call", async () => {
    const claims: AccessTokenClaims = {
      sub: "user-1",
      tenantId: "tenant-1",
      roles: ["admin"],
      permissions: ["tenants:write"],
      scope: "admin"
    };
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue(claims) } as unknown as JwtService;
    const guard = new JwtAuthGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer valid-token" } } as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(claims);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid-token", { secret: "access-secret" });
  });

  it("rejects a request without an Authorization header", async () => {
    const jwtService = { verifyAsync: vi.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(env, jwtService);
    const request = { headers: {} } as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an invalid or expired token", async () => {
    const jwtService = { verifyAsync: vi.fn().mockRejectedValue(new Error("expired")) } as unknown as JwtService;
    const guard = new JwtAuthGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer expired-token" } } as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token with the wrong scope", async () => {
    const claims = {
      sub: "user-1",
      tenantId: "tenant-1",
      roles: [],
      permissions: [],
      scope: "admin_refresh"
    };
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue(claims) } as unknown as JwtService;
    const guard = new JwtAuthGuard(env, jwtService);
    const request = { headers: { authorization: "Bearer refresh-token" } } as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
