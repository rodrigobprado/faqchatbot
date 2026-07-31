import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { roles } from "../schema.js";

export type CreateRoleInput = {
  tenantId?: string | null;
  slug: string;
  name: string;
};

export const createRolesRepository = (db: Database) => ({
  create: async (input: CreateRoleInput) => {
    const [role] = await db
      .insert(roles)
      .values({
        tenantId: input.tenantId ?? null,
        slug: input.slug,
        name: input.name
      })
      .returning();

    if (!role) {
      throw new Error("Failed to create role");
    }

    return role;
  },
  findBySlug: async (slug: string) => {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug));
    return role ?? null;
  }
});
