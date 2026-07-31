import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { analyticsEvents } from "../schema.js";

export type RecordAnalyticsEventInput = {
  tenantId: string;
  conversationId?: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export type AnalyticsPeriod = { from: Date; to: Date };

const inPeriod = (tenantId: string, period: AnalyticsPeriod, eventType?: string) =>
  and(
    eq(analyticsEvents.tenantId, tenantId),
    gte(analyticsEvents.createdAt, period.from),
    lte(analyticsEvents.createdAt, period.to),
    eventType ? eq(analyticsEvents.eventType, eventType) : undefined,
  );

export const createAnalyticsEventsRepository = (db: Database) => ({
  record: async (input: RecordAnalyticsEventInput) => {
    const [event] = await db.insert(analyticsEvents).values(input).returning();

    if (!event) {
      throw new Error("Failed to record analytics event");
    }

    return event;
  },
  aggregateByEventType: async (tenantId: string, period: AnalyticsPeriod) => {
    const rows = await db
      .select({ eventType: analyticsEvents.eventType, count: count() })
      .from(analyticsEvents)
      .where(inPeriod(tenantId, period))
      .groupBy(analyticsEvents.eventType);

    return rows.map((row) => ({ eventType: row.eventType, count: Number(row.count) }));
  },
  averageDurationMs: async (
    tenantId: string,
    eventType: string,
    period: AnalyticsPeriod,
  ): Promise<number | null> => {
    const [row] = await db
      .select({ avg: sql<string | null>`avg((${analyticsEvents.payload}->>'durationMs')::numeric)` })
      .from(analyticsEvents)
      .where(inPeriod(tenantId, period, eventType));

    return row?.avg !== null && row?.avg !== undefined ? Math.round(Number(row.avg)) : null;
  }
});
