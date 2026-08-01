import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies passwords", () => {
    const hashed = hashPassword("secret-password");

    expect(verifyPassword("secret-password", hashed)).toBe(true);
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });

  it("rejects malformed hashes", () => {
    expect(verifyPassword("secret-password", "malformed")).toBe(false);
  });
});
