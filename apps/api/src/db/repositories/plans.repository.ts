import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { plans, tenants } from "../schema.js";

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
  },
  list: async () => {
    return db.select().from(plans);
  },
  remove: async (id: string) => {
    await db.delete(plans).where(eq(plans.id, id));
  },
  countUsage: async (id: string) => {
    const rows = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.planId, id));
    return rows.length;
  },
  update: async (
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      priceCents: number;
      limits: Record<string, unknown>;
      isActive: boolean;
    }>,
  ) => {
    const [plan] = await db.update(plans).set(input).where(eq(plans.id, id)).returning();

    if (!plan) {
      throw new Error("Failed to update plan");
    }

    return plan;
  }
});
