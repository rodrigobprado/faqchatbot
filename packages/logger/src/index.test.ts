import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./index.js";

describe("createLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts secret-like context keys", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createLogger("test");

    logger.info("hello", { accessToken: "super-secret-token" });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.context.accessToken).toBe("[redacted]");
  });

  it("writes debug logs to stdout without redacting safe fields", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createLogger("test");

    logger.debug("debugging", { tenantId: "tenant-1", count: 2 });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.level).toBe("debug");
    expect(payload.context.tenantId).toBe("tenant-1");
    expect(payload.context.count).toBe(2);
  });

  it("writes warnings to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = createLogger("test");

    logger.warn("careful");

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.level).toBe("warn");
  });

  it("writes errors to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = createLogger("test");

    logger.error("failed");

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.level).toBe("error");
  });
});
