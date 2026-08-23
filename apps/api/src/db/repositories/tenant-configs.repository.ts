import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantConfigs } from "../schema.js";

export type UpsertTenantConfigInput = {
  tenantId: string;
  theme?: "light" | "dark" | "auto";
  primaryColor?: string;
  iconUrl?: string | null;
  initialMessage?: string;
  placeholder?: string;
};

export const createTenantConfigsRepository = (db: Database) => ({
  upsert: async (input: UpsertTenantConfigInput) => {
    const [config] = await db
      .insert(tenantConfigs)
      .values(input)
      .onConflictDoUpdate({
        target: tenantConfigs.tenantId,
        set: { ...input, updatedAt: new Date() }
      })
      .returning();

    if (!config) {
      throw new Error("Failed to upsert tenant config");
    }

    return config;
  },
  findByTenantId: async (tenantId: string) => {
    const [config] = await db.select().from(tenantConfigs).where(eq(tenantConfigs.tenantId, tenantId));
    return config ?? null;
  }
});
