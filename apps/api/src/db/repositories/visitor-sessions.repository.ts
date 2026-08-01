import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { visitorSessions } from "../schema.js";

export type PageContext = Readonly<{
  url: string;
  title?: string;
  language?: string;
  referrer?: string;
  utm: Record<string, string>;
  viewport: Readonly<{
    width: number;
    height: number;
  }>;
  userAgent?: string;
  currentPage?: string;
  timestamp: string;
}>;

export type CreateVisitorSessionInput = Readonly<{
  id?: string;
  tenantId: string;
  visitorId: string;
  pageContext: PageContext;
}>;

export const createVisitorSessionsRepository = (db: Database) => ({
  create: async (input: CreateVisitorSessionInput) => {
    const [session] = await db
      .insert(visitorSessions)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        visitorId: input.visitorId,
        pageContext: input.pageContext
      })
      .returning();

    if (!session) {
      throw new Error("Failed to create visitor session");
    }

    return session;
  },
  findById: async (id: string) => {
    const [session] = await db.select().from(visitorSessions).where(eq(visitorSessions.id, id));
    return session ?? null;
  },
  findLatestByTenantAndVisitor: async (tenantId: string, visitorId: string) => {
    const [session] = await db
      .select()
      .from(visitorSessions)
      .where(and(eq(visitorSessions.tenantId, tenantId), eq(visitorSessions.visitorId, visitorId)))
      .orderBy(desc(visitorSessions.lastSeenAt))
      .limit(1);

    return session ?? null;
  },
  touch: async (id: string, pageContext: PageContext) => {
    const [session] = await db
      .update(visitorSessions)
      .set({
        pageContext,
        lastSeenAt: new Date()
      })
      .where(eq(visitorSessions.id, id))
      .returning();

    return session ?? null;
  }
});
