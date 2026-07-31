import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
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
