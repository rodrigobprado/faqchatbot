import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "../../db/client.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AnalyticsService } from "../analytics/analytics.service.js";
import { DATABASE } from "../core/core.module.js";
import { RateLimitExceededException } from "./rate-limit-exceeded.exception.js";
import { resolveRateLimitPolicy, type RateLimitScope } from "./rate-limit-policy.js";
// NestJS resolves this constructor-injected class via emitDecoratorMetadata,
// which needs a real (non `import type`) reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RateLimiterService } from "./rate-limiter.service.js";

@Injectable()
export class RateLimitService {
  constructor(
    private readonly limiter: RateLimiterService,
    @Inject(DATABASE) private readonly db: Database,
    private readonly analytics: AnalyticsService,
  ) {}

  async enforce(scope: RateLimitScope, key: string, tenantId: string | null): Promise<void> {
    const policy = await resolveRateLimitPolicy(this.db, scope, tenantId);
    const result = await this.limiter.consume(`ratelimit:${scope}:${key}`, policy.limit, policy.windowSeconds);

    if (result.allowed) {
      return;
    }

    if (tenantId) {
      this.analytics.record({
        type: "RateLimitExceeded",
        tenantId,
        occurredAt: new Date().toISOString(),
        scope
      });
    }

    throw new RateLimitExceededException(scope, result.resetSeconds);
  }
}
