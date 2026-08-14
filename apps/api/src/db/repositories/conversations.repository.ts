import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { conversations } from "../schema.js";

export type CreateConversationInput = Readonly<{
  id?: string;
  tenantId: string;
  sessionId: string;
}>;

export const createConversationsRepository = (db: Database) => ({
  create: async (input: CreateConversationInput) => {
    const [conversation] = await db
      .insert(conversations)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        sessionId: input.sessionId
      })
      .returning();

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return conversation;
  },
  findById: async (id: string) => {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    return conversation ?? null;
  },
  findLatestBySessionId: async (sessionId: string) => {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(desc(conversations.startedAt))
      .limit(1);

    return conversation ?? null;
  },
  listByTenantId: async (tenantId: string) =>
    db
      .select()
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId))
      .orderBy(desc(conversations.startedAt))
});
