import { describe, expect, it } from "vitest";
import { createDeferred, createTestId, flushPromises } from "./index.js";

describe("testing package", () => {
  it("creates a deferred promise", async () => {
    const deferred = createDeferred<string>();
    deferred.resolve("ok");

    await expect(deferred.promise).resolves.toBe("ok");
  });

  it("creates a test id with a prefix", () => {
    expect(createTestId("case")).toMatch(/^case-/);
  });

  it("flushes microtasks", async () => {
    let finished = false;
    queueMicrotask(() => {
      finished = true;
    });

    await flushPromises();

    expect(finished).toBe(true);
  });
});
