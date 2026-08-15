import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { auditLogs } from "../schema.js";

export type AuditLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}>;

const normalizeAuditLogRecord = (row: Record<string, unknown>): AuditLogRecord => ({
  id: String(row.id ?? row["id"]),
  tenantId: (row.tenantId ?? row["tenant_id"]) as string | null,
  actorUserId: (row.actorUserId ?? row["actor_user_id"]) as string | null,
  action: String(row.action ?? row["action"]),
  targetType: String(row.targetType ?? row["target_type"]),
  targetId: String(row.targetId ?? row["target_id"]),
  metadata: (row.metadata as Record<string, unknown> | undefined) ?? {},
  createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt ?? row["created_at"]))
});

export type CreateAuditLogInput = Readonly<{
  id?: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}>;

export const createAuditLogsRepository = (db: Database) => ({
  create: async (input: CreateAuditLogInput) => {
    const [log] = await db
      .insert(auditLogs)
      .values({
        id: input.id,
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata ?? {}
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create audit log");
    }

    return normalizeAuditLogRecord(log as Record<string, unknown>);
  },
  listByTenantId: async (tenantId: string) =>
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .then((rows) => rows.map((row) => normalizeAuditLogRecord(row as Record<string, unknown>)))
});
