import type { Database } from "../../db/client.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createRateLimitPoliciesRepository, type RateLimitScope } from "../../db/repositories/rate-limit-policies.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";

export type { RateLimitScope } from "../../db/repositories/rate-limit-policies.repository.js";

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export const PLATFORM_DEFAULT_RATE_LIMITS: Record<RateLimitScope, RateLimitPolicy> = {
  ip: { limit: 60, windowSeconds: 60 },
  tenant: { limit: 600, windowSeconds: 60 },
  api_key: { limit: 300, windowSeconds: 60 },
  visitor: { limit: 20, windowSeconds: 60 },
  conversation: { limit: 20, windowSeconds: 60 }
};

const PLAN_LIMIT_SCOPES: ReadonlySet<RateLimitScope> = new Set(["visitor", "conversation"]);

const resolvePlanMessageLimit = async (db: Database, tenantId: string): Promise<RateLimitPolicy | null> => {
  const tenant = await createTenantsRepository(db).findById(tenantId);
  if (!tenant) {
    return null;
  }

  const plan = tenant.planId ? await createPlansRepository(db).findById(tenant.planId) : null;
  const messagesPerMinute = (plan?.limits as { messagesPerMinute?: unknown } | undefined)?.messagesPerMinute;

  return typeof messagesPerMinute === "number" ? { limit: messagesPerMinute, windowSeconds: 60 } : null;
};

export const resolveRateLimitPolicy = async (
  db: Database,
  scope: RateLimitScope,
  tenantId: string | null,
): Promise<RateLimitPolicy> => {
  if (tenantId) {
    const override = await createRateLimitPoliciesRepository(db).findByTenantAndScope(tenantId, scope);
    if (override) {
      return { limit: override.limit, windowSeconds: override.windowSeconds };
    }

    if (PLAN_LIMIT_SCOPES.has(scope)) {
      const planLimit = await resolvePlanMessageLimit(db, tenantId);
      if (planLimit) {
        return planLimit;
      }
    }
  }

  return PLATFORM_DEFAULT_RATE_LIMITS[scope];
};
