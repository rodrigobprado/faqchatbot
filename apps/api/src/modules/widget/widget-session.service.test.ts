import { randomUUID } from "node:crypto";
import type { WidgetSessionStartRequest } from "@faqchatbot/contracts";
import { parseEnvironment } from "@faqchatbot/config";
import { ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Redis } from "ioredis";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "../../db/client.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { AnalyticsService } from "../analytics/analytics.service.js";
import type { WidgetTokenClaims } from "../auth/access-token-claims.js";
import { RateLimiterService } from "../rate-limit/rate-limiter.service.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { WidgetSessionService } from "./widget-session.service.js";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) {
  throw new Error("DATABASE_URL and REDIS_URL are required to run repository integration tests");
}

let db: Database;
let client: Sql;
let redis: Redis;
let env: ReturnType<typeof parseEnvironment>;
let widgetSessionService: WidgetSessionService;
let planId: string;
const clientIp = () => randomUUID();

const buildRequest = (overrides: Partial<WidgetSessionStartRequest> = {}): WidgetSessionStartRequest => ({
  agentId: overrides.agentId ?? "missing-agent",
  visitorId: overrides.visitorId,
  sessionId: overrides.sessionId,
  conversationId: overrides.conversationId,
  context: overrides.context ?? {
    url: "https://acme.example.com/pricing",
    utm: {},
    viewport: { width: 1280, height: 800 },
    timestamp: new Date().toISOString()
  }
});

const createTenantWithDomain = async (domain: string) => {
  const tenants = createTenantsRepository(db);
  const domains = createTenantDomainsRepository(db);

  const tenant = await tenants.create({
    publicId: `tenant-${randomUUID()}`,
    name: "Acme Inc",
    planId
  });
  const created = await domains.create({ tenantId: tenant.id, domain });
  await domains.markVerified(created.id);

  return tenant;
};

beforeAll(async () => {
  ({ db, client } = createDatabase(databaseUrl));
  redis = new Redis(redisUrl);
  env = parseEnvironment(process.env);
  const rateLimit = new RateLimitService(new RateLimiterService(redis), db, new AnalyticsService(db));
  widgetSessionService = new WidgetSessionService(db, env, new JwtService(), rateLimit, new AnalyticsService(db));

  const plans = createPlansRepository(db);
  const existing = await plans.findBySlug("starter");
  planId = existing?.id ?? (await plans.create({ slug: "starter", name: "Starter" })).id;
});

afterAll(async () => {
  await client.end();
  await redis.quit();
});

describe("WidgetSessionService.start", () => {
  it("starts a brand-new visitor session and conversation", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");

    const result = await widgetSessionService.start(
      buildRequest({ agentId: tenant.publicId }),
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    expect(result.tenant.id).toBe(tenant.id);
    expect(result.visitorId).toBeTruthy();
    expect(result.sessionId).toBeTruthy();
    expect(result.conversationId).toBeTruthy();
    expect(result.expiresInSeconds).toBeGreaterThan(0);

    const claims = await new JwtService().verifyAsync<WidgetTokenClaims>(result.accessToken, {
      secret: env.JWT_WIDGET_SECRET
    });
    expect(claims.scope).toBe("widget");
    expect(claims.tenantId).toBe(tenant.id);
    expect(claims.sessionId).toBe(result.sessionId);
    expect(claims.conversationId).toBe(result.conversationId);

    const persistedSession = await createVisitorSessionsRepository(db).findById(result.sessionId);
    expect(persistedSession?.tenantId).toBe(tenant.id);

    const persistedConversation = await createConversationsRepository(db).findById(result.conversationId);
    expect(persistedConversation?.status).toBe("open");
  });

  it("reopens an existing session and conversation owned by the same visitor", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");
    const secondRequest = buildRequest({ agentId: tenant.publicId });

    const first = await widgetSessionService.start(
      buildRequest({ agentId: tenant.publicId }),
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    const second = await widgetSessionService.start(
      {
        ...secondRequest,
        visitorId: first.visitorId,
        sessionId: first.sessionId,
        conversationId: first.conversationId
      },
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    expect(second.sessionId).toBe(first.sessionId);
    expect(second.conversationId).toBe(first.conversationId);
    expect(second.visitorId).toBe(first.visitorId);

    const touched = await createVisitorSessionsRepository(db).findById(first.sessionId);
    expect(touched?.pageContext).toEqual(secondRequest.context);
  });

  it("ignores a sessionId that belongs to a different visitor and starts a new one", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");

    const first = await widgetSessionService.start(
      buildRequest({ agentId: tenant.publicId }),
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    const second = await widgetSessionService.start(
      buildRequest({ agentId: tenant.publicId, sessionId: first.sessionId }),
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.visitorId).not.toBe(first.visitorId);
  });

  it("rejects an unknown agentId", async () => {
    await expect(
      widgetSessionService.start(
        buildRequest({ agentId: "no-such-agent" }),
        "https://acme.example.com",
        undefined,
        clientIp(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a request from a domain not registered for the tenant", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");

    await expect(
      widgetSessionService.start(
        buildRequest({ agentId: tenant.publicId }),
        "https://evil.example.org",
        undefined,
        clientIp(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a request without an Origin or Referer header", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");

    await expect(
      widgetSessionService.start(buildRequest({ agentId: tenant.publicId }), undefined, undefined, clientIp()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("signs the widget token with a secret different from the admin access token", async () => {
    const tenant = await createTenantWithDomain("acme.example.com");

    const result = await widgetSessionService.start(
      buildRequest({ agentId: tenant.publicId }),
      "https://acme.example.com",
      undefined,
      clientIp(),
    );

    await expect(
      new JwtService().verifyAsync(result.accessToken, { secret: env.JWT_ACCESS_SECRET }),
    ).rejects.toThrow();
  });
});
