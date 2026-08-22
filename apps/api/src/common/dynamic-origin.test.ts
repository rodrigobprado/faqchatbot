import { describe, expect, it, vi } from "vitest";
import { buildCorsOriginValidator } from "./dynamic-origin.js";

const waitFor = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe("buildCorsOriginValidator", () => {
  it("allows requests without an origin header", async () => {
    const validator = buildCorsOriginValidator(() => Promise.resolve(["acme.com"]));

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator(undefined, (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(true);
  });

  it("allows origins registered for active tenants", async () => {
    const listAllowedHostnames = vi.fn().mockResolvedValue(["chat.acme.com"]);
    const validator = buildCorsOriginValidator(listAllowedHostnames);

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator("https://chat.acme.com", (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(true);
  });

  it("rejects unregistered origins", async () => {
    const validator = buildCorsOriginValidator(() => Promise.resolve(["chat.acme.com"]));

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator("https://evil.example.com", (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(false);
  });

  it("matches hosts case-insensitively and ignores the port scheme", async () => {
    const validator = buildCorsOriginValidator(() => Promise.resolve(["chat.acme.com"]));

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator("https://CHAT.ACME.COM:443", (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(true);
  });

  it("supports extra development origins", async () => {
    const validator = buildCorsOriginValidator(() => Promise.resolve([]), ["http://localhost:5174"]);

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator("http://localhost:5174", (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(true);
  });

  it("caches lookups within the ttl window", async () => {
    const listAllowedHostnames = vi.fn().mockResolvedValue(["a.com"]);
    const validator = buildCorsOriginValidator(listAllowedHostnames);

    for (let index = 0; index < 3; index += 1) {
      await new Promise<boolean | undefined>((resolve) => {
        validator("https://a.com", (_e, allow) => resolve(allow));
      });
    }

    expect(listAllowedHostnames).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the domain lookup errors", async () => {
    const loggerWarn = vi.fn();
    vi.doMock("@faqchatbot/logger", () => ({
      createLogger: () => ({ warn: loggerWarn })
    }));
    try {
      const { buildCorsOriginValidator: freshBuilder } = await import("./dynamic-origin.js");
      const validator = freshBuilder(() => Promise.reject(new Error("db down")));

      const allowed = await new Promise<boolean | undefined>((resolve) => {
        validator("https://a.com", (_error, allow) => resolve(allow));
      });
      void waitFor;

      expect(allowed).toBe(false);
    } finally {
      vi.doUnmock("@faqchatbot/logger");
    }
  });

  it("rejects malformed origin headers", async () => {
    const validator = buildCorsOriginValidator(() => Promise.resolve([]));

    const allowed = await new Promise<boolean | undefined>((resolve) => {
      validator("not-a-url", (_error, allow) => resolve(allow));
    });

    expect(allowed).toBe(false);
  });
});
