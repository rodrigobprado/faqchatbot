import { Inject, Injectable } from "@nestjs/common";
// NestJS resolves this constructor-injected class via emitDecoratorMetadata,
// which needs a real (non `import type`) reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Redis } from "ioredis";
import { REDIS } from "../core/core.module.js";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

// Atomic fixed-window counter: INCR + first-hit EXPIRE in a single Redis
// round-trip, avoiding a race between the two commands under concurrent load.
const CONSUME_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`;

@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const [current, ttl] = (await this.redis.eval(CONSUME_SCRIPT, 1, key, windowSeconds)) as [number, number];

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetSeconds: ttl > 0 ? ttl : windowSeconds
    };
  }
}
