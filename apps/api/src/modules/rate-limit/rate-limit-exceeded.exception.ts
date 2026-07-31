import { HttpException, HttpStatus } from "@nestjs/common";
import type { RateLimitScope } from "./rate-limit-policy.js";

export class RateLimitExceededException extends HttpException {
  constructor(scope: RateLimitScope, retryAfterSeconds: number) {
    super(`Rate limit exceeded for scope "${scope}". Retry in ${retryAfterSeconds}s.`, HttpStatus.TOO_MANY_REQUESTS);
  }
}
