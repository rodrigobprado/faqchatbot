import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenants } from "../schema.js";

export type CreateTenantInput = {
  publicId: string;
  name: string;
  planId: string;
  defaultLocale?: string;
};

export type UpdateTenantInput = Partial<{
  name: string;
  status: "active" | "inactive" | "suspended";
  planId: string | null;
  defaultLocale: string;
}>;

export const createTenantsRepository = (db: Database) => ({
  create: async (input: CreateTenantInput) => {
    const [tenant] = await db
      .insert(tenants)
      .values({
        publicId: input.publicId,
        name: input.name,
        planId: input.planId,
        defaultLocale: input.defaultLocale ?? "pt-BR"
      })
      .returning();

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    return tenant;
  },
  findByPublicId: async (publicId: string) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.publicId, publicId), isNull(tenants.deletedAt)));
    return tenant ?? null;
  },
  findById: async (id: string) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)));
    return tenant ?? null;
  },
  list: async () => db.select().from(tenants).where(isNull(tenants.deletedAt)),
  update: async (id: string, input: UpdateTenantInput) => {
    const [tenant] = await db
      .update(tenants)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    return tenant ?? null;
  },
  softDelete: async (id: string) => {
    const [tenant] = await db
      .update(tenants)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    return tenant ?? null;
  }
});
