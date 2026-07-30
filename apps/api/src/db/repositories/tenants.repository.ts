import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenants } from "../schema.js";

export type CreateTenantInput = {
  publicId: string;
  name: string;
  planId: string;
  defaultLocale?: string;
};

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
    const [tenant] = await db.select().from(tenants).where(eq(tenants.publicId, publicId));
    return tenant ?? null;
  },
  findById: async (id: string) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant ?? null;
  }
});
