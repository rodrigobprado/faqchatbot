import { randomUUID } from "node:crypto";
import type { Database } from "../../db/client.js";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "./analytics.service.js";

const occurredAt = new Date().toISOString();

const createFakeDb = (returning: () => Promise<unknown[]>) => {
  const insertSpy = vi.fn();
  const db = {
    insert: () => ({
      values: (value: unknown) => {
        insertSpy(value);
        return { returning };
      }
    })
  } as unknown as Database;

  return { db, insertSpy };
};

describe("AnalyticsService.record", () => {
  it("persists a valid event carrying a tenantId", async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const { db, insertSpy } = createFakeDb(async () => [
      { id: randomUUID(), tenantId, conversationId, eventType: "ButtonClicked", payload: {}, createdAt: new Date() }
    ]);
    const service = new AnalyticsService(db);

    service.record({ type: "ButtonClicked", tenantId, occurredAt, conversationId, buttonId: "cta-1" });

    await vi.waitFor(() =>
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId, conversationId, eventType: "ButtonClicked" }),
      ),
    );
  });

  it("drops an event without a tenantId and never touches the database", async () => {
    const { db, insertSpy } = createFakeDb(async () => [{}]);
    const service = new AnalyticsService(db);

    service.record({ type: "RateLimitExceeded", occurredAt, scope: "ip" });

    await new Promise((resolve) => setImmediate(resolve));
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("does not throw or leave an unhandled rejection when persistence fails", async () => {
    const { db } = createFakeDb(() => Promise.reject(new Error("connection lost")));
    const service = new AnalyticsService(db);
    const tenantId = randomUUID();

    expect(() =>
      service.record({ type: "RateLimitExceeded", tenantId, occurredAt, scope: "tenant" }),
    ).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));
  });
});
