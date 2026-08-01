import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantConfigs } from "../schema.js";

export type TenantConfigInput = Readonly<{
  tenantId: string;
  theme?: "light" | "dark" | "auto";
  primaryColor?: string;
  iconUrl?: string | null;
  initialMessage?: string;
  placeholder?: string;
}>;

export const createTenantConfigsRepository = (db: Database) => ({
  findByTenantId: async (tenantId: string) => {
    const [config] = await db.select().from(tenantConfigs).where(eq(tenantConfigs.tenantId, tenantId));
    return config ?? null;
  },
  upsert: async (input: TenantConfigInput) => {
    const existing = await db.select().from(tenantConfigs).where(eq(tenantConfigs.tenantId, input.tenantId));
    const nextValue = {
      tenantId: input.tenantId,
      theme: input.theme ?? "auto",
      primaryColor: input.primaryColor ?? "#2563eb",
      iconUrl: input.iconUrl ?? null,
      initialMessage: input.initialMessage ?? "Ola! Como posso ajudar?",
      placeholder: input.placeholder ?? "Digite sua mensagem"
    };

    if (existing.length > 0) {
      const [updated] = await db
        .update(tenantConfigs)
        .set({
          theme: nextValue.theme,
          primaryColor: nextValue.primaryColor,
          iconUrl: nextValue.iconUrl,
          initialMessage: nextValue.initialMessage,
          placeholder: nextValue.placeholder,
          updatedAt: new Date()
        })
        .where(eq(tenantConfigs.tenantId, input.tenantId))
        .returning();

      if (!updated) {
        throw new Error("Failed to update tenant config");
      }

      return updated;
    }

    const [created] = await db.insert(tenantConfigs).values(nextValue).returning();
    if (!created) {
      throw new Error("Failed to create tenant config");
    }

    return created;
  }
});
