import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { plans } from "../schema.js";

export type CreatePlanInput = {
  slug: string;
  name: string;
  limits?: Record<string, unknown>;
  priceCents?: number;
};

export const createPlansRepository = (db: Database) => ({
  create: async (input: CreatePlanInput) => {
    const [plan] = await db
      .insert(plans)
      .values({
        slug: input.slug,
        name: input.name,
        limits: input.limits ?? {},
        priceCents: input.priceCents ?? 0
      })
      .returning();

    if (!plan) {
      throw new Error("Failed to create plan");
    }

    return plan;
  },
  findBySlug: async (slug: string) => {
    const [plan] = await db.select().from(plans).where(eq(plans.slug, slug));
    return plan ?? null;
  },
  findById: async (id: string) => {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan ?? null;
  }
});
