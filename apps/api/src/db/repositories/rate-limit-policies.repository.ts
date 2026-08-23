import { and, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { rateLimitPolicies } from "../schema.js";

export type RateLimitScope = "ip" | "tenant" | "api_key" | "visitor" | "conversation";

export type UpsertRateLimitPolicyInput = {
  tenantId: string;
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
};

export const createRateLimitPoliciesRepository = (db: Database) => ({
  upsert: async (input: UpsertRateLimitPolicyInput) => {
    const [existing] = await db
      .select()
      .from(rateLimitPolicies)
      .where(and(eq(rateLimitPolicies.tenantId, input.tenantId), eq(rateLimitPolicies.scope, input.scope)));

    if (existing) {
      const [updated] = await db
        .update(rateLimitPolicies)
        .set({ limit: input.limit, windowSeconds: input.windowSeconds })
        .where(eq(rateLimitPolicies.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update rate limit policy");
      }

      return updated;
    }

    const [created] = await db.insert(rateLimitPolicies).values(input).returning();

    if (!created) {
      throw new Error("Failed to create rate limit policy");
    }

    return created;
  },
  findByTenantAndScope: async (tenantId: string, scope: RateLimitScope) => {
    const [policy] = await db
      .select()
      .from(rateLimitPolicies)
      .where(and(eq(rateLimitPolicies.tenantId, tenantId), eq(rateLimitPolicies.scope, scope)));

    return policy ?? null;
  },
  listByTenantId: async (tenantId: string) =>
    db.select().from(rateLimitPolicies).where(eq(rateLimitPolicies.tenantId, tenantId))
});
