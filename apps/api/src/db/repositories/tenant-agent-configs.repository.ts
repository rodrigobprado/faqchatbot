import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantAgentConfigs } from "../schema.js";

export type AgentProvider =
  | "n8n"
  | "openai_responses"
  | "langgraph"
  | "flowise"
  | "dify"
  | "crewai"
  | "mcp"
  | "custom";

export type UpsertTenantAgentConfigInput = {
  tenantId: string;
  provider: AgentProvider;
  model?: string;
  webhookEndpointId?: string | null;
  encryptedCredentialsRef?: string | null;
  routingRules?: Record<string, unknown>;
  timeoutMs?: number;
  retryPolicy?: Record<string, unknown>;
};

export const createTenantAgentConfigsRepository = (db: Database) => ({
  upsert: async (input: UpsertTenantAgentConfigInput) => {
    const [existing] = await db
      .select()
      .from(tenantAgentConfigs)
      .where(eq(tenantAgentConfigs.tenantId, input.tenantId));

    if (existing) {
      const [updated] = await db
        .update(tenantAgentConfigs)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(tenantAgentConfigs.tenantId, input.tenantId))
        .returning();

      if (!updated) {
        throw new Error("Failed to update tenant agent config");
      }

      return updated;
    }

    const [created] = await db.insert(tenantAgentConfigs).values(input).returning();

    if (!created) {
      throw new Error("Failed to create tenant agent config");
    }

    return created;
  },
  findByTenantId: async (tenantId: string) => {
    const [config] = await db
      .select()
      .from(tenantAgentConfigs)
      .where(eq(tenantAgentConfigs.tenantId, tenantId));

    return config ?? null;
  }
});
