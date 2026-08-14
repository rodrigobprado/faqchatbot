import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { users } from "../schema.js";

export type UserRecord = Readonly<{
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  status: "active" | "invited" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateUserInput = {
  tenantId: string;
  email: string;
  passwordHash: string;
  status?: "active" | "invited" | "suspended";
};

export const createUsersRepository = (db: Database) => ({
  create: async (input: CreateUserInput): Promise<UserRecord> => {
    const [user] = await db
      .insert(users)
      .values({
        tenantId: input.tenantId,
        email: input.email,
        passwordHash: input.passwordHash,
        status: input.status ?? "active"
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user as UserRecord;
  },
  findByEmail: async (email: string): Promise<UserRecord | null> => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return (user ?? null) as UserRecord | null;
  },
  findById: async (id: string): Promise<UserRecord | null> => {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return (user ?? null) as UserRecord | null;
  },
  listByTenantId: async (tenantId: string): Promise<UserRecord[]> =>
    (await db.select().from(users).where(eq(users.tenantId, tenantId))) as UserRecord[],
  updateStatus: async (id: string, status: "active" | "invited" | "suspended"): Promise<UserRecord | null> => {
    const [user] = await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id)).returning();

    return (user ?? null) as UserRecord | null;
  }
});
