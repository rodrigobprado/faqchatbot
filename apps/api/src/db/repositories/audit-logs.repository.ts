import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { auditLogs } from "../schema.js";

export type CreateAuditLogInput = {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export const createAuditLogsRepository = (db: Database) => ({
  create: async (input: CreateAuditLogInput) => {
    const [log] = await db
      .insert(auditLogs)
      .values({
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

    return log;
  },
  listByTenantId: async (tenantId: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}) => {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
});
