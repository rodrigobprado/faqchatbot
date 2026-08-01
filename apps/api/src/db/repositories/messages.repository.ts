import { asc, desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { messages } from "../schema.js";

export type MessageRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: unknown;
  metadata: Record<string, unknown> | null;
  providerMessageId: string | null;
  createdAt: Date;
}>;

const normalizeMessageRecord = (row: Record<string, unknown>): MessageRecord => ({
  id: String(row.id ?? row["id"]),
  tenantId: String(row.tenantId ?? row["tenant_id"]),
  conversationId: String(row.conversationId ?? row["conversation_id"]),
  role: row.role as MessageRecord["role"],
  type: String(row.type ?? row["type"]),
  content: row.content,
  metadata: (row.metadata as Record<string, unknown> | null | undefined) ?? null,
  providerMessageId: (row.providerMessageId ?? row["provider_message_id"]) as string | null,
  createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt ?? row["created_at"]))
});

export type CreateMessageInput = Readonly<{
  id?: string;
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  providerMessageId?: string | null;
}>;

export const createMessagesRepository = (db: Database) => ({
  create: async (input: CreateMessageInput) => {
    const [message] = await db
      .insert(messages)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        role: input.role,
        type: input.type,
        content: input.content,
        metadata: input.metadata ?? {},
        providerMessageId: input.providerMessageId ?? null
      })
      .returning();

    if (!message) {
      throw new Error("Failed to create message");
    }

    return normalizeMessageRecord(message as Record<string, unknown>);
  },
  findById: async (id: string) => {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message ? normalizeMessageRecord(message as Record<string, unknown>) : null;
  },
  listByConversationId: async (conversationId: string) =>
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .then((rows) => rows.map((row) => normalizeMessageRecord(row as Record<string, unknown>))),
  findLatestByConversationId: async (conversationId: string) =>
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .then((rows) => (rows[0] ? normalizeMessageRecord(rows[0] as Record<string, unknown>) : null))
});
