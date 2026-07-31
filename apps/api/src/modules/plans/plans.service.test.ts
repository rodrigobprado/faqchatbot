import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { PlansService } from "./plans.service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run repository integration tests");
}

let db: Database;
let client: Sql;
let plansService: PlansService;

beforeAll(() => {
  ({ db, client } = createDatabase(databaseUrl));
  plansService = new PlansService(db);
});

afterAll(async () => {
  await client.end();
});

describe("PlansService", () => {
  it("creates and lists plans", async () => {
    const created = await plansService.create({ slug: `plan-${randomUUID()}`, name: "Starter" });

    const all = await plansService.list();

    expect(all.some((plan) => plan.id === created.id)).toBe(true);
  });

  it("throws NotFoundException for an unknown plan id", async () => {
    await expect(plansService.get(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates a plan's name, price and limits", async () => {
    const created = await plansService.create({ slug: `plan-${randomUUID()}`, name: "Starter" });

    const updated = await plansService.update(created.id, {
      name: "Starter Plus",
      priceCents: 4900,
      limits: { messagesPerMinute: 30 }
    });

    expect(updated.name).toBe("Starter Plus");
    expect(updated.limits).toEqual({ messagesPerMinute: 30 });
  });

  it("throws NotFoundException when updating an unknown plan", async () => {
    await expect(plansService.update(randomUUID(), { name: "X" })).rejects.toBeInstanceOf(NotFoundException);
  });
});
