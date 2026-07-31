import { randomUUID } from "node:crypto";
import type {
  PageContext,
  WidgetSessionStartRequest,
  WidgetSessionStartResponse
} from "@faqchatbot/contracts";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
// NestJS resolves this constructor-injected class via emitDecoratorMetadata,
// which needs a real (non `import type`) reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { JwtService } from "@nestjs/jwt";
import type { Database } from "../../db/client.js";
import {
  createConversationsRepository,
  type CreateConversationInput
} from "../../db/repositories/conversations.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantConfigsRepository } from "../../db/repositories/tenant-configs.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AnalyticsService } from "../analytics/analytics.service.js";
import type { WidgetTokenClaims } from "../auth/access-token-claims.js";
import { DATABASE, ENV } from "../core/core.module.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { resolveTenantPublicConfig } from "../tenants/tenant-public-config.js";
import { extractRequestDomain } from "./request-domain.js";

const WIDGET_TOKEN_TTL_SECONDS = 60 * 60;
const WIDGET_DEFAULT_POSITION = "bottom-right";
const WIDGET_DEFAULT_WIDTH = 380;
const WIDGET_DEFAULT_HEIGHT = 600;
const INVALID_AGENT_OR_ORIGIN = "Invalid agent or origin";

type VisitorSessionsRepository = ReturnType<typeof createVisitorSessionsRepository>;
type ConversationsRepository = ReturnType<typeof createConversationsRepository>;

// ponytail: regex heuristic, not a full UA parser; upgrade if device breakdown needs precision
const deriveDevice = (userAgent: string | undefined): "desktop" | "mobile" | "tablet" | "unknown" => {
  if (!userAgent) {
    return "unknown";
  }
  if (/tablet|ipad/i.test(userAgent)) {
    return "tablet";
  }
  if (/mobile|android|iphone/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
};

@Injectable()
export class WidgetSessionService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ENV) private readonly env: PlatformEnvironment,
    private readonly jwtService: JwtService,
    private readonly rateLimit: RateLimitService,
    private readonly analytics: AnalyticsService,
  ) {}

  async start(
    input: WidgetSessionStartRequest,
    requestOrigin: string | undefined,
    requestReferer: string | undefined,
    clientIp: string,
  ): Promise<WidgetSessionStartResponse> {
    await this.rateLimit.enforce("ip", clientIp, null);

    const domain = extractRequestDomain(requestOrigin, requestReferer);
    if (!domain) {
      throw new ForbiddenException(INVALID_AGENT_OR_ORIGIN);
    }

    const tenant = await createTenantsRepository(this.db).findByPublicId(input.agentId);
    if (!tenant) {
      throw new ForbiddenException(INVALID_AGENT_OR_ORIGIN);
    }

    await this.rateLimit.enforce("tenant", tenant.id, tenant.id);

    const registeredDomains = await createTenantDomainsRepository(this.db).listByTenantId(tenant.id);
    if (!registeredDomains.some((registered) => registered.domain === domain)) {
      throw new ForbiddenException(INVALID_AGENT_OR_ORIGIN);
    }

    const plan = await createPlansRepository(this.db).findById(tenant.planId);
    if (!plan) {
      throw new ForbiddenException(INVALID_AGENT_OR_ORIGIN);
    }

    const config = await createTenantConfigsRepository(this.db).findByTenantId(tenant.id);
    const publicConfig = resolveTenantPublicConfig(tenant, plan, config, domain);

    const visitorSessions = createVisitorSessionsRepository(this.db);
    const visitorId = input.visitorId ?? randomUUID();
    const session = await this.resolveSession(visitorSessions, tenant.id, visitorId, input.sessionId, input.context);

    const conversations = createConversationsRepository(this.db);
    const conversation = await this.resolveConversation(
      conversations,
      tenant.id,
      session.id,
      input.conversationId,
    );

    this.analytics.record({
      type: "WidgetSessionStarted",
      tenantId: tenant.id,
      occurredAt: new Date().toISOString(),
      visitorId,
      sessionId: session.id,
      conversationId: conversation.id,
      origin: domain,
      pageUrl: input.context.url,
      device: deriveDevice(input.context.userAgent)
    });

    const claims: WidgetTokenClaims = {
      sub: visitorId,
      tenantId: tenant.id,
      sessionId: session.id,
      conversationId: conversation.id,
      scope: "widget"
    };

    return {
      accessToken: this.jwtService.sign(claims, {
        secret: this.env.JWT_WIDGET_SECRET,
        expiresIn: WIDGET_TOKEN_TTL_SECONDS
      }),
      expiresInSeconds: WIDGET_TOKEN_TTL_SECONDS,
      visitorId,
      sessionId: session.id,
      conversationId: conversation.id,
      tenant: { id: tenant.id, publicId: tenant.publicId, name: tenant.name },
      config: {
        locale: publicConfig.locale,
        theme: publicConfig.theme,
        position: WIDGET_DEFAULT_POSITION,
        primaryColor: publicConfig.primaryColor,
        initialMessage: publicConfig.initialMessage,
        placeholder: publicConfig.placeholder,
        width: WIDGET_DEFAULT_WIDTH,
        height: WIDGET_DEFAULT_HEIGHT
      }
    };
  }

  private async resolveSession(
    repository: VisitorSessionsRepository,
    tenantId: string,
    visitorId: string,
    sessionId: string | undefined,
    pageContext: PageContext,
  ) {
    const existing = sessionId ? await repository.findById(sessionId) : null;
    const ownedByVisitor = existing?.tenantId === tenantId && existing?.visitorId === visitorId;

    return ownedByVisitor
      ? repository.touch(existing.id, pageContext)
      : repository.create({ tenantId, visitorId, pageContext });
  }

  private async resolveConversation(
    repository: ConversationsRepository,
    tenantId: string,
    sessionId: string,
    conversationId: string | undefined,
  ) {
    const existing = conversationId ? await repository.findById(conversationId) : null;
    const isReusable =
      existing?.tenantId === tenantId && existing?.sessionId === sessionId && existing?.status === "open";

    const reopened = isReusable ? existing : await repository.findLatestOpenBySessionId(sessionId);
    const input: CreateConversationInput = { tenantId, sessionId };

    return reopened ?? repository.create(input);
  }
}
