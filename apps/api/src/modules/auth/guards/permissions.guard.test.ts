import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequest } from "./jwt-auth.guard.js";
import { PermissionsGuard } from "./permissions.guard.js";

const createContext = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined
  }) as unknown as ExecutionContext;

describe("PermissionsGuard", () => {
  it("allows the request when no permissions are required", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it("allows the request when the user has every required permission", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["tenants:write"])
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const request = {
      user: { sub: "u1", tenantId: "t1", roles: [], permissions: ["tenants:write"], scope: "admin" as const }
    } as AuthenticatedRequest;

    expect(guard.canActivate(createContext(request))).toBe(true);
  });

  it("rejects the request when a required permission is missing", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["tenants:write"])
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const request = {
      user: { sub: "u1", tenantId: "t1", roles: [], permissions: ["tenants:read"], scope: "admin" as const }
    } as AuthenticatedRequest;

    expect(() => guard.canActivate(createContext(request))).toThrow(ForbiddenException);
  });
});
