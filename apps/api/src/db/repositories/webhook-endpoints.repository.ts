import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { webhookEndpoints } from "../schema.js";

export type CreateWebhookEndpointInput = {
  tenantId: string;
  url: string;
  secretRef: string;
};

export const createWebhookEndpointsRepository = (db: Database) => ({
  create: async (input: CreateWebhookEndpointInput) => {
    const [endpoint] = await db.insert(webhookEndpoints).values(input).returning();

    if (!endpoint) {
      throw new Error("Failed to create webhook endpoint");
    }

    return endpoint;
  },
  findById: async (id: string) => {
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    return endpoint ?? null;
  }
});
