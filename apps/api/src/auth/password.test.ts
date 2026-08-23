import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("hashes a password into an argon2 digest distinct from the plain text", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toBe("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies a matching password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("produces different hashes for the same password due to random salt", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
  });
});
