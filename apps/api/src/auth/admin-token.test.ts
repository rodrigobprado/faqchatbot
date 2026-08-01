import { describe, expect, it } from "vitest";
import {
  createAdminAccessToken,
  createAdminRefreshToken,
  decodeAdminAccessToken,
  decodeAdminRefreshToken
} from "./admin-token.js";

describe("admin-token", () => {
  it("creates and verifies access tokens", () => {
    const secret = "access-secret";
    const token = createAdminAccessToken(
      {
        scope: "admin",
        userId: "11111111-1111-4111-8111-111111111111",
        tenantId: "22222222-2222-4222-8222-222222222222",
        roles: ["admin"],
        issuedAt: 1,
        expiresAt: 2
      },
      secret,
    );

    expect(decodeAdminAccessToken(token, secret)).toMatchObject({
      scope: "admin",
      roles: ["admin"]
    });
  });

  it("creates and verifies refresh tokens", () => {
    const secret = "refresh-secret";
    const token = createAdminRefreshToken(
      {
        scope: "admin_refresh",
        userId: "11111111-1111-4111-8111-111111111111",
        tenantId: "22222222-2222-4222-8222-222222222222",
        issuedAt: 1,
        expiresAt: 2,
        nonce: "nonce"
      },
      secret,
    );

    expect(decodeAdminRefreshToken(token, secret)).toMatchObject({
      scope: "admin_refresh",
      nonce: "nonce"
    });
  });
});
