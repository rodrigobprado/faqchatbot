import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { analyticsEvents } from "../schema.js";
import { createAnalyticsEventsRepository } from "./analytics-events.repository.js";
import { createPlansRepository } from "./plans.repository.js";
import { createTenantsRepository } from "./tenants.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
});

afterAll(async () => {
  await client.end();
});

const createTenant = async () => {
  const plans = createPlansRepository(db);
  const tenants = createTenantsRepository(db);
  const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });
  return tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId: plan.id
  });
};

describe("AnalyticsEventsRepository", () => {
  it("records an event with its payload", async () => {
    const tenant = await createTenant();
    const events = createAnalyticsEventsRepository(db);
    const visitorId = randomUUID();

    const event = await events.record({
      tenantId: tenant.id,
      eventType: "WidgetSessionStarted",
      payload: { visitorId }
    });

    expect(event.tenantId).toBe(tenant.id);
    expect(event.eventType).toBe("WidgetSessionStarted");
    expect(event.payload).toEqual({ visitorId });
    expect(event.conversationId).toBeNull();
  });
});

describe("AnalyticsEventsRepository.aggregateByEventType", () => {
  it("counts events grouped by type within the given period", async () => {
    const tenant = await createTenant();
    const events = createAnalyticsEventsRepository(db);
    const from = new Date(Date.now() - 60_000);
    const to = new Date(Date.now() + 60_000);

    await events.record({ tenantId: tenant.id, eventType: "WidgetSessionStarted", payload: {} });
    await events.record({ tenantId: tenant.id, eventType: "WidgetSessionStarted", payload: {} });
    await events.record({ tenantId: tenant.id, eventType: "ButtonClicked", payload: {} });

    const totals = await events.aggregateByEventType(tenant.id, { from, to });

    expect(totals).toEqual(
      expect.arrayContaining([
        { eventType: "WidgetSessionStarted", count: 2 },
        { eventType: "ButtonClicked", count: 1 }
      ]),
    );
  });

  it("excludes events outside the requested period", async () => {
    const tenant = await createTenant();
    const events = createAnalyticsEventsRepository(db);

    await db.insert(analyticsEvents).values({
      tenantId: tenant.id,
      eventType: "WidgetSessionStarted",
      payload: {},
      createdAt: new Date("2020-01-01T00:00:00.000Z")
    });

    const totals = await events.aggregateByEventType(tenant.id, {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000)
    });

    expect(totals).toEqual([]);
  });
});

describe("AnalyticsEventsRepository.averageDurationMs", () => {
  it("averages the durationMs field across matching events", async () => {
    const tenant = await createTenant();
    const events = createAnalyticsEventsRepository(db);
    const period = { from: new Date(Date.now() - 60_000), to: new Date(Date.now() + 60_000) };

    await events.record({
      tenantId: tenant.id,
      eventType: "AgentRoutingCompleted",
      payload: { durationMs: 100 }
    });
    await events.record({
      tenantId: tenant.id,
      eventType: "AgentRoutingCompleted",
      payload: { durationMs: 300 }
    });

    const average = await events.averageDurationMs(tenant.id, "AgentRoutingCompleted", period);

    expect(average).toBe(200);
  });

  it("returns null when there are no matching events", async () => {
    const tenant = await createTenant();
    const events = createAnalyticsEventsRepository(db);
    const period = { from: new Date(Date.now() - 60_000), to: new Date(Date.now() + 60_000) };

    const average = await events.averageDurationMs(tenant.id, "AgentRoutingCompleted", period);

    expect(average).toBeNull();
  });
});
