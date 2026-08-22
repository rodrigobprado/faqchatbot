import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantDomains, tenants } from "../schema.js";

export type CreateTenantDomainInput = {
  tenantId: string;
  domain: string;
};

export const createTenantDomainsRepository = (db: Database) => ({
  create: async (input: CreateTenantDomainInput) => {
    const [domain] = await db.insert(tenantDomains).values(input).returning();

    if (!domain) {
      throw new Error("Failed to create tenant domain");
    }

    return domain;
  },
  listByTenantId: async (tenantId: string) =>
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenantId)),
  remove: async (id: string) => {
    const [domain] = await db.delete(tenantDomains).where(eq(tenantDomains.id, id)).returning();
    return domain ?? null;
  },
  listActiveTenantHostnames: async (): Promise<string[]> => {
    const rows = await db
      .selectDistinct({ domain: tenantDomains.domain })
      .from(tenantDomains)
      .innerJoin(tenants, eq(tenants.id, tenantDomains.tenantId))
      .where(eq(tenants.status, "active"));
    return rows.map((row) => row.domain.toLowerCase());
  }
});
