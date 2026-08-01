import { describe, expect, it } from "vitest";
import { createCorsOriginResolver } from "./cors.js";

describe("createCorsOriginResolver", () => {
  it("allows localhost origins when no allowlist is configured", async () => {
    const resolveOrigin = createCorsOriginResolver(undefined);

    await expect(resolveOrigin("http://localhost:3000")).resolves.toBe("http://localhost:3000");
  });

  it("rejects external origins when no allowlist is configured", async () => {
    const resolveOrigin = createCorsOriginResolver(undefined);

    await expect(resolveOrigin("https://example.com")).resolves.toBe(false);
  });

  it("allows configured origins", async () => {
    const resolveOrigin = createCorsOriginResolver("https://example.com");

    await expect(resolveOrigin("https://example.com")).resolves.toBe("https://example.com");
  });
});
