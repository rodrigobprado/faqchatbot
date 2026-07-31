import { Module } from "@nestjs/common";
import { RateLimiterService } from "./rate-limiter.service.js";
import { RateLimitService } from "./rate-limit.service.js";

@Module({
  providers: [RateLimiterService, RateLimitService],
  exports: [RateLimitService]
})
export class RateLimitModule {}
