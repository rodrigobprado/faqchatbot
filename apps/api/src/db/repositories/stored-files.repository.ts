import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { storedFiles } from "../schema.js";

export type CreateStoredFileInput = {
  tenantId: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId?: string | null;
};

export const createStoredFilesRepository = (db: Database) => ({
  create: async (input: CreateStoredFileInput) => {
    const [file] = await db
      .insert(storedFiles)
      .values({
        tenantId: input.tenantId,
        bucket: input.bucket,
        objectKey: input.objectKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedByUserId: input.uploadedByUserId ?? null
      })
      .returning();

    if (!file) {
      throw new Error("Failed to create stored file");
    }

    return file;
  },
  findById: async (id: string) => {
    const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, id)).limit(1);
    return file ?? null;
  },
  listByTenantId: async (tenantId: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}) => {
    return db
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.tenantId, tenantId))
      .orderBy(desc(storedFiles.createdAt))
      .limit(limit)
      .offset(offset);
  },
  findByIdAndTenantId: async (id: string, tenantId: string) => {
    const [file] = await db
      .select()
      .from(storedFiles)
      .where(and(eq(storedFiles.id, id), eq(storedFiles.tenantId, tenantId)))
      .limit(1);
    return file ?? null;
  }
});
