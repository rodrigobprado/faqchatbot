import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { RateLimiterService } from "./rate-limiter.service.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run rate limiter integration tests");
}

const redis = new Redis(redisUrl);

afterAll(async () => {
  await redis.quit();
});

describe("RateLimiterService.consume", () => {
  it("allows requests below the limit", async () => {
    const limiter = new RateLimiterService(redis);
    const key = `test:${randomUUID()}`;

    const result = await limiter.consume(key, 3, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests once the limit is reached", async () => {
    const limiter = new RateLimiterService(redis);
    const key = `test:${randomUUID()}`;

    await limiter.consume(key, 2, 60);
    await limiter.consume(key, 2, 60);
    const third = await limiter.consume(key, 2, 60);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets the count once the window elapses", async () => {
    const limiter = new RateLimiterService(redis);
    const key = `test:${randomUUID()}`;

    await limiter.consume(key, 1, 1);
    const blocked = await limiter.consume(key, 1, 1);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const afterReset = await limiter.consume(key, 1, 1);
    expect(afterReset.allowed).toBe(true);
  });

  it("keeps counters isolated per key", async () => {
    const limiter = new RateLimiterService(redis);
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;

    await limiter.consume(keyA, 1, 60);
    const resultB = await limiter.consume(keyB, 1, 60);

    expect(resultB.allowed).toBe(true);
  });
});
