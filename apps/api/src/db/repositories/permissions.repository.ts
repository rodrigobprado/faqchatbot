import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { permissions } from "../schema.js";

export type CreatePermissionInput = {
  slug: string;
  description?: string;
};

export const createPermissionsRepository = (db: Database) => ({
  create: async (input: CreatePermissionInput) => {
    const [permission] = await db
      .insert(permissions)
      .values({ slug: input.slug, description: input.description })
      .returning();

    if (!permission) {
      throw new Error("Failed to create permission");
    }

    return permission;
  },
  findBySlug: async (slug: string) => {
    const [permission] = await db.select().from(permissions).where(eq(permissions.slug, slug));
    return permission ?? null;
  }
});
