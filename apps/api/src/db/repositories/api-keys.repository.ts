import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { apiKeys } from "../schema.js";

export type CreateApiKeyInput = Readonly<{
  tenantId: string;
  name: string;
  hashedKey: string;
  prefix: string;
}>;

export const createApiKeysRepository = (db: Database) => ({
  create: async (input: CreateApiKeyInput) => {
    const [apiKey] = await db.insert(apiKeys).values(input).returning();

    if (!apiKey) {
      throw new Error("Failed to create api key");
    }

    return apiKey;
  },
  findById: async (id: string) => {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey ?? null;
  },
  listByTenantId: async (tenantId: string) =>
    db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId)).orderBy(desc(apiKeys.createdAt)),
  revoke: async (id: string) => {
    const [apiKey] = await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id)).returning();

    return apiKey ?? null;
  }
});
