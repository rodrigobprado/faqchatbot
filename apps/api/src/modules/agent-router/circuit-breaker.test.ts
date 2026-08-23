import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "./circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("stays closed below the failure threshold", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });

    breaker.recordFailure("tenant-1");
    breaker.recordFailure("tenant-1");

    expect(breaker.isOpen("tenant-1")).toBe(false);
  });

  it("opens after reaching the failure threshold", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });

    breaker.recordFailure("tenant-1");
    breaker.recordFailure("tenant-1");
    breaker.recordFailure("tenant-1");

    expect(breaker.isOpen("tenant-1")).toBe(true);
  });

  it("closes again after a success", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });

    breaker.recordFailure("tenant-1");
    breaker.recordFailure("tenant-1");
    expect(breaker.isOpen("tenant-1")).toBe(true);

    breaker.recordSuccess("tenant-1");

    expect(breaker.isOpen("tenant-1")).toBe(false);
  });

  it("keeps failure counts isolated per key", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });

    breaker.recordFailure("tenant-1");

    expect(breaker.isOpen("tenant-1")).toBe(true);
    expect(breaker.isOpen("tenant-2")).toBe(false);
  });

  it("closes again once the cooldown window has elapsed", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 20 });

    breaker.recordFailure("tenant-1");
    expect(breaker.isOpen("tenant-1")).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(breaker.isOpen("tenant-1")).toBe(false);
  });
});
