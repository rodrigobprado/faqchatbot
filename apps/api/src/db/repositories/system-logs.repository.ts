import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { systemLogs } from "../schema.js";

export type SystemLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
  createdAt: Date;
}>;

const normalizeSystemLogRecord = (row: Record<string, unknown>): SystemLogRecord => ({
  id: String(row.id ?? row["id"]),
  tenantId: (row.tenantId ?? row["tenant_id"]) as string | null,
  level: row.level as SystemLogRecord["level"],
  message: String(row.message ?? row["message"]),
  context: (row.context as Record<string, unknown> | undefined) ?? {},
  createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt ?? row["created_at"]))
});

export type CreateSystemLogInput = Readonly<{
  id?: string;
  tenantId?: string | null;
  level: SystemLogRecord["level"];
  message: string;
  context?: Record<string, unknown>;
}>;

export const createSystemLogsRepository = (db: Database) => ({
  create: async (input: CreateSystemLogInput) => {
    const [log] = await db
      .insert(systemLogs)
      .values({
        id: input.id,
        tenantId: input.tenantId ?? null,
        level: input.level,
        message: input.message,
        context: input.context ?? {}
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create system log");
    }

    return normalizeSystemLogRecord(log as Record<string, unknown>);
  },
  listByTenantId: async (tenantId: string) =>
    db
      .select()
      .from(systemLogs)
      .where(eq(systemLogs.tenantId, tenantId))
      .orderBy(desc(systemLogs.createdAt))
      .then((rows) => rows.map((row) => normalizeSystemLogRecord(row as Record<string, unknown>)))
});
