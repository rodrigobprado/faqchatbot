import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "../../db/client.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
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
  ) {}

  async enforce(scope: RateLimitScope, key: string, tenantId: string | null): Promise<void> {
    const policy = await resolveRateLimitPolicy(this.db, scope, tenantId);
    const result = await this.limiter.consume(`ratelimit:${scope}:${key}`, policy.limit, policy.windowSeconds);

    if (result.allowed) {
      return;
    }

    if (tenantId) {
      await createAnalyticsEventsRepository(this.db).record({
        tenantId,
        eventType: "RateLimitExceeded",
        payload: { type: "RateLimitExceeded", scope, occurredAt: new Date().toISOString() }
      });
    }

    throw new RateLimitExceededException(scope, result.resetSeconds);
  }
}
