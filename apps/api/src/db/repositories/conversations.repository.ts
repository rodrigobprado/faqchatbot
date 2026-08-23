import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { conversations } from "../schema.js";

export type CreateConversationInput = {
  tenantId: string;
  sessionId: string;
};

export const createConversationsRepository = (db: Database) => ({
  create: async (input: CreateConversationInput) => {
    const [conversation] = await db.insert(conversations).values(input).returning();

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return conversation;
  },
  findById: async (id: string) => {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation ?? null;
  },
  findByIdAndTenantId: async (id: string, tenantId: string) => {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .limit(1);
    return conversation ?? null;
  },
  findLatestOpenBySessionId: async (sessionId: string) => {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.sessionId, sessionId), eq(conversations.status, "open")))
      .orderBy(desc(conversations.startedAt))
      .limit(1);

    return conversation ?? null;
  },
  listByTenantId: async (tenantId: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}) => {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId))
      .orderBy(desc(conversations.startedAt))
      .limit(limit)
      .offset(offset);
  },
  close: async (id: string, endedAt: Date) => {
    const [conversation] = await db
      .update(conversations)
      .set({ status: "closed", endedAt })
      .where(eq(conversations.id, id))
      .returning();

    if (!conversation) {
      throw new Error("Failed to close conversation");
    }

    return conversation;
  }
});
