import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAdminAccessToken } from "../../auth/admin-token.js";
import { AdminAuthGuard } from "./admin-auth.guard.js";

describe("AdminAuthGuard", () => {
  it("accepts valid admin access tokens", () => {
    const previousSecret = process.env.JWT_ADMIN_SECRET;
    const secret = "guard-secret";
    process.env.JWT_ADMIN_SECRET = secret;

    try {
      const guard = new AdminAuthGuard();
      const token = createAdminAccessToken(
        {
          scope: "admin",
          userId: randomUUID(),
          tenantId: randomUUID(),
          roles: ["admin"],
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
      expect(request.adminUser?.scope).toBe("admin");
    } finally {
      process.env.JWT_ADMIN_SECRET = previousSecret;
    }
  });

  it("rejects missing tokens", () => {
    const guard = new AdminAuthGuard();

    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} })
        })
      } as never),
    ).toThrow("Missing admin access token");
  });

  it("rejects expired or malformed tokens", () => {
    const previousSecret = process.env.JWT_ADMIN_SECRET;
    const secret = "guard-secret";
    process.env.JWT_ADMIN_SECRET = secret;

    try {
      const guard = new AdminAuthGuard();
      const expiredToken = createAdminAccessToken(
        {
          scope: "admin",
          userId: randomUUID(),
          tenantId: randomUUID(),
          roles: ["admin"],
          issuedAt: 1,
          expiresAt: 1
        },
        secret,
      );
      const wrongScopeToken = createAdminAccessToken(
        {
          scope: "service",
          userId: randomUUID(),
          tenantId: randomUUID(),
          roles: ["viewer"],
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 60
        } as never,
        secret,
      );

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
      ).toThrow("Invalid admin access token");

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
      ).toThrow("Invalid admin access token");

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
      ).toThrow("Invalid admin access token");
    } finally {
      process.env.JWT_ADMIN_SECRET = previousSecret;
    }
  });
});
