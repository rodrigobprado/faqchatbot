import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { roles, userRoles } from "../schema.js";

export const createUserRolesRepository = (db: Database) => ({
  assign: async (userId: string, roleId: string) => {
    const [assignment] = await db.insert(userRoles).values({ userId, roleId }).returning();

    if (!assignment) {
      throw new Error("Failed to assign role to user");
    }

    return assignment;
  },
  replaceRoles: async (userId: string, roleIds: readonly string[]) => {
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length === 0) {
      return [];
    }
    return db
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId, roleId })))
      .returning();
  },
  listRoleSlugsByUserId: async (userId: string) => {
    const rows = await db
      .select({ slug: roles.slug })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return rows.map((row) => row.slug);
  }
});
