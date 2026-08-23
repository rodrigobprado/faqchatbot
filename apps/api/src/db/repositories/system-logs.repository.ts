import { and, desc, eq, type SQL } from "drizzle-orm";
import type { Database } from "../client.js";
import { systemLogs } from "../schema.js";

export type SystemLogLevel = "debug" | "info" | "warn" | "error";

export type CreateSystemLogInput = {
  tenantId?: string | null;
  level: SystemLogLevel;
  message: string;
  correlationId?: string | null;
  context?: Record<string, unknown>;
};

export const createSystemLogsRepository = (db: Database) => ({
  create: async (input: CreateSystemLogInput) => {
    const [log] = await db
      .insert(systemLogs)
      .values({
        tenantId: input.tenantId ?? null,
        level: input.level,
        message: input.message,
        correlationId: input.correlationId ?? null,
        context: input.context ?? {}
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create system log");
    }

    return log;
  },
  list: async (
    {
      tenantId,
      level,
      limit = 50,
      offset = 0
    }: { tenantId?: string; level?: SystemLogLevel; limit?: number; offset?: number } = {},
  ) => {
    const filters: SQL[] = [];
    if (tenantId) {
      filters.push(eq(systemLogs.tenantId, tenantId));
    }
    if (level) {
      filters.push(eq(systemLogs.level, level));
    }

    return db
      .select()
      .from(systemLogs)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
});
