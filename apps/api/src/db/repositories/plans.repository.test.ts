import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../client.js";
import { createPlansRepository } from "./plans.repository.js";

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

describe("PlansRepository.findById", () => {
  it("returns the plan by id", async () => {
    const plans = createPlansRepository(db);
    const plan = await plans.create({ slug: `plan-${randomUUID()}`, name: "Starter" });

    const found = await plans.findById(plan.id);

    expect(found?.id).toBe(plan.id);
  });

  it("returns null for an id that does not exist", async () => {
    const plans = createPlansRepository(db);

    const found = await plans.findById(randomUUID());

    expect(found).toBeNull();
  });
});
