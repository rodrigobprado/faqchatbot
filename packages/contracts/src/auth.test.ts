import { describe, expect, it } from "vitest";
import {
  adminLoginRequestSchema,
  adminLoginResponseSchema,
  refreshTokenRequestSchema
} from "./auth.js";

describe("adminLoginRequestSchema", () => {
  it("accepts a valid email and password", () => {
    const request = adminLoginRequestSchema.parse({
      email: "admin@example.com",
      password: "correct horse battery staple"
    });

    expect(request.email).toBe("admin@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      adminLoginRequestSchema.parse({ email: "not-an-email", password: "correct horse battery staple" }),
    ).toThrow();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() => adminLoginRequestSchema.parse({ email: "admin@example.com", password: "short" })).toThrow();
  });
});

describe("adminLoginResponseSchema", () => {
  it("accepts a valid login response payload", () => {
    const response = adminLoginResponseSchema.parse({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresInSeconds: 900,
      user: {
        id: "3e15f2c1-2f0b-4a5c-9a9c-4d9a1f1f9a2b",
        email: "admin@example.com",
        tenantId: "3e15f2c1-2f0b-4a5c-9a9c-4d9a1f1f9a2c"
      }
    });

    expect(response.expiresInSeconds).toBe(900);
  });
});

describe("refreshTokenRequestSchema", () => {
  it("rejects an empty refresh token", () => {
    expect(() => refreshTokenRequestSchema.parse({ refreshToken: "" })).toThrow();
  });
});
