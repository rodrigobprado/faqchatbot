import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { messages } from "../schema.js";

export type CreateMessageInput = {
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  providerMessageId?: string;
};

export const createMessagesRepository = (db: Database) => ({
  create: async (input: CreateMessageInput) => {
    const [message] = await db.insert(messages).values(input).returning();

    if (!message) {
      throw new Error("Failed to create message");
    }

    return message;
  },
  listByConversationId: async (conversationId: string) =>
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt)),
  listByConversationAndTenantId: async (conversationId: string, tenantId: string) =>
    db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.tenantId, tenantId)))
      .orderBy(asc(messages.createdAt))
});
