import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../client.js";
import { apiKeys } from "../schema.js";

export type CreateApiKeyInput = {
  tenantId: string;
  name: string;
  hashedKey: string;
  prefix: string;
  last4: string;
};

export const createApiKeysRepository = (db: Database) => ({
  create: async (input: CreateApiKeyInput) => {
    const [apiKey] = await db.insert(apiKeys).values(input).returning();

    if (!apiKey) {
      throw new Error("Failed to create api key");
    }

    return apiKey;
  },
  findActiveByPrefix: async (prefix: string) => {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)));

    return apiKey ?? null;
  },
  listByTenantId: async (tenantId: string) => {
    return db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId));
  },
  findByIdAndTenantId: async (id: string, tenantId: string) => {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)))
      .limit(1);

    return apiKey ?? null;
  },
  revoke: async (id: string) => {
    const [apiKey] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();

    return apiKey ?? null;
  }
});
