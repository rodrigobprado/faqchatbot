import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { tenantDomains } from "../schema.js";

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
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenantId))
});
