import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { permissions, rolePermissions, userRoles } from "../schema.js";

export const createRolePermissionsRepository = (db: Database) => ({
  assign: async (roleId: string, permissionId: string) => {
    const [assignment] = await db.insert(rolePermissions).values({ roleId, permissionId }).returning();

    if (!assignment) {
      throw new Error("Failed to assign permission to role");
    }

    return assignment;
  },
  listPermissionSlugsByRoleId: async (roleId: string) => {
    const rows = await db
      .select({ slug: permissions.slug })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return rows.map((row) => row.slug);
  },
  listPermissionSlugsByUserId: async (userId: string) => {
    const rows = await db
      .select({ slug: permissions.slug })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return Array.from(new Set(rows.map((row) => row.slug)));
  }
});
