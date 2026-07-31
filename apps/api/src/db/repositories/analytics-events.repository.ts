import type { Database } from "../client.js";
import { analyticsEvents } from "../schema.js";

export type RecordAnalyticsEventInput = {
  tenantId: string;
  conversationId?: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export const createAnalyticsEventsRepository = (db: Database) => ({
  record: async (input: RecordAnalyticsEventInput) => {
    const [event] = await db.insert(analyticsEvents).values(input).returning();

    if (!event) {
      throw new Error("Failed to record analytics event");
    }

    return event;
  }
});
