import { and, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { users } from "../schema.js";

export type CreateUserInput = {
  tenantId: string;
  email: string;
  passwordHash: string;
};

export const createUsersRepository = (db: Database) => ({
  create: async (input: CreateUserInput) => {
    const [user] = await db.insert(users).values(input).returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  },
  findByEmail: async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  },
  findById: async (id: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },
  findByIdAndTenantId: async (id: string, tenantId: string) => {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);
    return user ?? null;
  },
  updateStatus: async (id: string, status: "active" | "invited" | "suspended") => {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },
  listByTenantId: async (tenantId: string) => {
    return db.select().from(users).where(eq(users.tenantId, tenantId));
  }
});
