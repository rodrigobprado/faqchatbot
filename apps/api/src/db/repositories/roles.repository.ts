import { and, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { roles } from "../schema.js";

export type CreateRoleInput = Readonly<{
  tenantId?: string;
  slug: string;
  name: string;
}>;

export const createRolesRepository = (db: Database) => ({
  create: async (input: CreateRoleInput) => {
    const [role] = await db.insert(roles).values(input).returning();

    if (!role) {
      throw new Error("Failed to create role");
    }

    return role;
  },
  findByTenantIdAndSlug: async (tenantId: string | null | undefined, slug: string) => {
    const filters = tenantId ? and(eq(roles.tenantId, tenantId), eq(roles.slug, slug)) : eq(roles.slug, slug);
    const [role] = await db.select().from(roles).where(filters);

    return role ?? null;
  },
  listByTenantId: async (tenantId: string) => db.select().from(roles).where(eq(roles.tenantId, tenantId))
});
