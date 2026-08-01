import { eq, desc } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantAgentConfigs } from "../schema.js";

export type TenantAgentConfigInput = Readonly<{
  tenantId: string;
  provider: "n8n" | "openai_responses" | "langgraph" | "flowise" | "dify" | "crewai" | "mcp" | "custom";
  model?: string | null;
  webhookEndpointId?: string | null;
  encryptedCredentialsRef?: string | null;
  routingRules?: Record<string, unknown>;
  timeoutMs?: number;
  retryPolicy?: Record<string, unknown>;
  isActive?: boolean;
}>;

export const createTenantAgentConfigsRepository = (db: Database) => ({
  findLatestByTenantId: async (tenantId: string) => {
    const [config] = await db
      .select()
      .from(tenantAgentConfigs)
      .where(eq(tenantAgentConfigs.tenantId, tenantId))
      .orderBy(desc(tenantAgentConfigs.createdAt))
      .limit(1);

    return config ?? null;
  },
  upsert: async (input: TenantAgentConfigInput) => {
    const existing = await db
      .select()
      .from(tenantAgentConfigs)
      .where(eq(tenantAgentConfigs.tenantId, input.tenantId))
      .orderBy(desc(tenantAgentConfigs.createdAt))
      .limit(1);

    const values = {
      tenantId: input.tenantId,
      provider: input.provider,
      model: input.model ?? null,
      webhookEndpointId: input.webhookEndpointId ?? null,
      encryptedCredentialsRef: input.encryptedCredentialsRef ?? null,
      routingRules: input.routingRules ?? {},
      timeoutMs: input.timeoutMs ?? 15000,
      retryPolicy: input.retryPolicy ?? {},
      isActive: input.isActive ?? true
    };

    if (existing[0]) {
      const [updated] = await db
        .update(tenantAgentConfigs)
        .set({
          ...values,
          updatedAt: new Date()
        })
        .where(eq(tenantAgentConfigs.id, existing[0].id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update tenant agent config");
      }

      return updated;
    }

    const [created] = await db.insert(tenantAgentConfigs).values(values).returning();
    if (!created) {
      throw new Error("Failed to create tenant agent config");
    }

    return created;
  }
});
