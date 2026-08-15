import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { analyticsEvents } from "../schema.js";

export type AnalyticsEventRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}>;

const normalizeAnalyticsEventRecord = (row: Record<string, unknown>): AnalyticsEventRecord => ({
  id: String(row.id ?? row["id"]),
  tenantId: String(row.tenantId ?? row["tenant_id"]),
  conversationId: (row.conversationId ?? row["conversation_id"]) as string | null,
  eventType: String(row.eventType ?? row["event_type"]),
  payload: (row.payload as Record<string, unknown> | undefined) ?? {},
  createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt ?? row["created_at"]))
});

export type CreateAnalyticsEventInput = Readonly<{
  id?: string;
  tenantId: string;
  conversationId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}>;

export const createAnalyticsEventsRepository = (db: Database) => ({
  create: async (input: CreateAnalyticsEventInput) => {
    const [event] = await db
      .insert(analyticsEvents)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        conversationId: input.conversationId ?? null,
        eventType: input.eventType,
        payload: input.payload ?? {}
      })
      .returning();

    if (!event) {
      throw new Error("Failed to create analytics event");
    }

    return normalizeAnalyticsEventRecord(event as Record<string, unknown>);
  },
  listByTenantId: async (tenantId: string) =>
    db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.tenantId, tenantId))
      .orderBy(desc(analyticsEvents.createdAt))
      .then((rows) => rows.map((row) => normalizeAnalyticsEventRecord(row as Record<string, unknown>)))
});
