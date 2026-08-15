import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createAdminRefreshToken } from "../../auth/admin-token.js";
import { hashPassword } from "../../auth/password.js";
import { AuthService, createAdminTokenSecrets } from "./auth.service.js";

const createService = () => {
  const dependencies = {
    users: {
      findByEmail: vi.fn(),
      findById: vi.fn()
    },
    userRoles: {
      listRoleSlugsByUserId: vi.fn()
    },
    accessTokenSecret: "access-secret-access-secret",
    refreshTokenSecret: "refresh-secret-refresh-secret",
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 60 * 60 * 24 * 30
  } as const;

  return { service: new AuthService(dependencies), dependencies };
};

describe("AuthService", () => {
  it("authenticates an admin user", async () => {
    const { service, dependencies } = createService();
    const passwordHash = hashPassword("secret-password");

    dependencies.users.findByEmail.mockResolvedValue({
      id: randomUUID(),
      tenantId: randomUUID(),
      email: "admin@example.com",
      passwordHash,
      status: "active"
    });
    dependencies.userRoles.listRoleSlugsByUserId.mockResolvedValue([{ slug: "admin" }]);

    const response = await service.login({
      email: "admin@example.com",
      password: "secret-password"
    });

    expect(response.user.roles).toEqual(["admin"]);
    expect(response.accessToken).toContain(".");
    expect(response.refreshToken).toContain(".");
  });

  it("rejects invalid credentials", async () => {
    const { service, dependencies } = createService();

    dependencies.users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: "admin@example.com",
        password: "secret-password"
      }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("rejects inactive users and bad passwords", async () => {
    const { service, dependencies } = createService();
    const passwordHash = hashPassword("secret-password");

    dependencies.users.findByEmail.mockResolvedValue({
      id: randomUUID(),
      tenantId: randomUUID(),
      email: "admin@example.com",
      passwordHash,
      status: "inactive"
    });

    await expect(
      service.login({
        email: "admin@example.com",
        password: "secret-password"
      }),
    ).rejects.toThrow("Invalid credentials");

    dependencies.users.findByEmail.mockResolvedValueOnce({
      id: randomUUID(),
      tenantId: randomUUID(),
      email: "admin@example.com",
      passwordHash,
      status: "active"
    });

    await expect(
      service.login({
        email: "admin@example.com",
        password: "wrong-password"
      }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("refreshes an access token", async () => {
    const { service, dependencies } = createService();
    const userId = randomUUID();
    const tenantId = randomUUID();

    dependencies.users.findByEmail.mockResolvedValue({
      id: userId,
      tenantId,
      email: "admin@example.com",
      passwordHash: hashPassword("secret-password"),
      status: "active"
    });
    dependencies.users.findById.mockResolvedValue({
      id: userId,
      tenantId,
      email: "admin@example.com",
      passwordHash: hashPassword("secret-password"),
      status: "active"
    });
    dependencies.userRoles.listRoleSlugsByUserId.mockResolvedValue([{ slug: "admin" }]);

    const login = await service.login({
      email: "admin@example.com",
      password: "secret-password"
    });
    const refreshed = await service.refresh({
      refreshToken: login.refreshToken
    });

    expect(refreshed.user.id).toBe(userId);
    expect(refreshed.user.roles).toEqual(["admin"]);
  });

  it("rejects expired refresh tokens", async () => {
    const { service, dependencies } = createService();
    const userId = randomUUID();
    const tenantId = randomUUID();

    dependencies.users.findById.mockResolvedValue({
      id: userId,
      tenantId,
      email: "admin@example.com",
      passwordHash: hashPassword("secret-password"),
      status: "active"
    });

    const expiredToken = createAdminRefreshToken(
      {
        scope: "admin_refresh",
        userId,
        tenantId,
        issuedAt: 1,
        expiresAt: 1,
        nonce: randomUUID()
      },
      "refresh-secret-refresh-secret",
    );

    await expect(
      service.refresh({
        refreshToken: expiredToken
      }),
    ).rejects.toThrow("Refresh token expired");
  });

  it("rejects invalid refresh payloads and tokens", async () => {
    const { service, dependencies } = createService();

    await expect(service.refresh({})).rejects.toThrow("Invalid refresh payload");

    await expect(
      service.refresh({
        refreshToken: "malformed.token"
      }),
    ).rejects.toThrow("Invalid token");

    const token = createAdminRefreshToken(
      {
        scope: "admin_refresh",
        userId: randomUUID(),
        tenantId: randomUUID(),
        issuedAt: 1,
        expiresAt: Math.floor(Date.now() / 1000) + 60,
        nonce: randomUUID()
      },
      "refresh-secret-refresh-secret",
    );

    dependencies.users.findById.mockResolvedValue({
      id: randomUUID(),
      tenantId: randomUUID(),
      email: "admin@example.com",
      passwordHash: hashPassword("secret-password"),
      status: "active"
    });

    await expect(
      service.refresh({
        refreshToken: token
      }),
    ).rejects.toThrow("Invalid refresh token");
  });

  it("rejects invalid login payloads", async () => {
    const { service } = createService();

    await expect(service.login({ email: "x" })).rejects.toThrow("Invalid login payload");
  });

  it("resolves admin token secrets from env and falls back to legacy names", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAdminSecret = process.env.JWT_ADMIN_SECRET;
    const previousRefreshSecret = process.env.JWT_ADMIN_REFRESH_SECRET;
    const previousAccessSecret = process.env.JWT_ACCESS_SECRET;
    const previousLegacyRefreshSecret = process.env.JWT_REFRESH_SECRET;

    try {
      process.env.NODE_ENV = "test";
      process.env.JWT_ADMIN_SECRET = "admin-secret";
      process.env.JWT_ADMIN_REFRESH_SECRET = "refresh-secret";

      expect(createAdminTokenSecrets()).toEqual({
        accessTokenSecret: "admin-secret",
        refreshTokenSecret: "refresh-secret"
      });

      delete process.env.JWT_ADMIN_SECRET;
      delete process.env.JWT_ADMIN_REFRESH_SECRET;
      process.env.JWT_ACCESS_SECRET = "legacy-access-secret";
      process.env.JWT_REFRESH_SECRET = "legacy-refresh-secret";

      expect(createAdminTokenSecrets()).toEqual({
        accessTokenSecret: "legacy-access-secret",
        refreshTokenSecret: "legacy-refresh-secret"
      });

      process.env.NODE_ENV = "production";
      delete process.env.JWT_ADMIN_SECRET;
      delete process.env.JWT_ADMIN_REFRESH_SECRET;
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => createAdminTokenSecrets()).toThrow(
        "JWT_ADMIN_SECRET or JWT_ACCESS_SECRET is required in production",
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.JWT_ADMIN_SECRET = previousAdminSecret;
      process.env.JWT_ADMIN_REFRESH_SECRET = previousRefreshSecret;
      process.env.JWT_ACCESS_SECRET = previousAccessSecret;
      process.env.JWT_REFRESH_SECRET = previousLegacyRefreshSecret;
    }
  });
});
