import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { visitorSessions } from "../schema.js";

export type CreateVisitorSessionInput = {
  tenantId: string;
  visitorId: string;
  pageContext: Record<string, unknown>;
};

export const createVisitorSessionsRepository = (db: Database) => ({
  create: async (input: CreateVisitorSessionInput) => {
    const [session] = await db.insert(visitorSessions).values(input).returning();

    if (!session) {
      throw new Error("Failed to create visitor session");
    }

    return session;
  },
  findById: async (id: string) => {
    const [session] = await db.select().from(visitorSessions).where(eq(visitorSessions.id, id));
    return session ?? null;
  },
  touch: async (id: string, pageContext: Record<string, unknown>) => {
    const [session] = await db
      .update(visitorSessions)
      .set({ pageContext, lastSeenAt: new Date() })
      .where(eq(visitorSessions.id, id))
      .returning();

    if (!session) {
      throw new Error("Failed to update visitor session");
    }

    return session;
  }
});
