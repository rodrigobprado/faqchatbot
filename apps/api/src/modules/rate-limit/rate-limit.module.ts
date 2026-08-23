import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { RateLimiterService } from "./rate-limiter.service.js";
import { RateLimitService } from "./rate-limit.service.js";

@Module({
  imports: [AnalyticsModule],
  providers: [RateLimiterService, RateLimitService],
  exports: [RateLimitService]
})
export class RateLimitModule {}
