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
  findByDomain: async (domain: string) => {
    const [tenantDomain] = await db
      .select()
      .from(tenantDomains)
      .where(eq(tenantDomains.domain, domain));

    return tenantDomain ?? null;
  },
  listByTenantId: async (tenantId: string) =>
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenantId))
});
