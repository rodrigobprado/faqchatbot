import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { roles, userRoles } from "../schema.js";

export const createUserRolesRepository = (db: Database) => ({
  assignRole: async (userId: string, roleId: string) => {
    const [row] = await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing().returning();
    return row ?? null;
  },
  removeRolesByUserId: async (userId: string) => {
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
  },
  listRoleSlugsByUserId: async (userId: string) =>
    db
      .select({
        slug: roles.slug
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
});
