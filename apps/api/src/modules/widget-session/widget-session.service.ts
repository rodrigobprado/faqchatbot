import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { createWidgetAccessToken } from "../../auth/widget-token.js";
import { z } from "zod";

type PageContext = Readonly<{
  url: string;
  title?: string;
  language?: string;
  referrer?: string;
  utm: Record<string, string>;
  viewport: Readonly<{
    width: number;
    height: number;
  }>;
  userAgent?: string;
  currentPage?: string;
  timestamp: string;
}>;

type WidgetSessionStartRequest = Readonly<{
  agentId: string;
  visitorId?: string;
  sessionId?: string;
  conversationId?: string;
  context: PageContext;
}>;

type WidgetSessionStartResponse = Readonly<{
  accessToken: string;
  expiresInSeconds: number;
  visitorId: string;
  sessionId: string;
  conversationId: string;
  tenant: Readonly<{
    id: string;
    publicId: string;
    name: string;
  }>;
  config: Readonly<{
    locale: string;
    theme: "light" | "dark" | "auto";
    position: "bottom-right" | "bottom-left";
    primaryColor: string;
    initialMessage: string;
    placeholder: string;
    width: number;
    height: number;
  }>;
}>;

const httpUrlSchema = z.string().refine((value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, {
  message: "URL must use http or https"
});

const widgetSessionStartRequestSchema = z.object({
  agentId: z.string().min(1).max(120),
  visitorId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  context: z.object({
    url: httpUrlSchema,
    title: z.string().max(300).optional(),
    language: z.string().max(35).optional(),
    referrer: httpUrlSchema.optional().or(z.literal("")),
    utm: z.record(z.string(), z.string()).default({}),
    viewport: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }),
    userAgent: z.string().max(1000).optional(),
    currentPage: z.string().max(2000).optional(),
    timestamp: z.string().datetime()
  })
});

type TenantRecord = Readonly<{
  id: string;
  publicId: string;
  name: string;
  status: "active" | "inactive" | "suspended";
  defaultLocale: string;
}>;

type TenantDomainRecord = Readonly<{
  domain: string;
}>;

type VisitorSessionRecord = Readonly<{
  id: string;
  tenantId: string;
  visitorId: string;
}>;

type ConversationRecord = Readonly<{
  id: string;
  tenantId: string;
  sessionId: string;
}>;

export type WidgetSessionDependencies = Readonly<{
  tenants: {
    findByPublicId(publicId: string): Promise<TenantRecord | null>;
  };
  tenantDomains: {
    listByTenantId(tenantId: string): Promise<TenantDomainRecord[]>;
  };
  visitorSessions: {
    create(input: {
      id?: string;
      tenantId: string;
      visitorId: string;
      pageContext: PageContext;
    }): Promise<VisitorSessionRecord>;
    findById(id: string): Promise<VisitorSessionRecord | null>;
    findLatestByTenantAndVisitor(tenantId: string, visitorId: string): Promise<VisitorSessionRecord | null>;
    touch(id: string, pageContext: PageContext): Promise<VisitorSessionRecord | null>;
  };
  conversations: {
    create(input: { id?: string; tenantId: string; sessionId: string }): Promise<ConversationRecord>;
    findById(id: string): Promise<ConversationRecord | null>;
    findLatestBySessionId(sessionId: string): Promise<ConversationRecord | null>;
  };
  widgetTokenSecret: string;
  widgetTokenTtlSeconds: number;
}>;

type StartHeaders = Readonly<{
  origin?: string;
  referer?: string;
}>;

const defaultWidgetConfig = {
  position: "bottom-right" as const,
  theme: "auto" as const,
  primaryColor: "#2563eb",
  initialMessage: "Ola! Como posso ajudar?",
  placeholder: "Digite sua mensagem",
  width: 380,
  height: 620
};

const extractHostname = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeDomain = (value: string): string => value.trim().toLowerCase();

const hostMatchesDomain = (host: string, domain: string): boolean => {
  const normalizedHost = normalizeDomain(host);
  const normalizedDomain = normalizeDomain(domain);

  return (
    normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`)
  );
};

const isDomainAllowed = (host: string, domains: TenantDomainRecord[]): boolean =>
  domains.some((domain) => hostMatchesDomain(host, domain.domain));

const validateHostIfPresent = (
  host: string | null,
  domains: TenantDomainRecord[],
) => {
  if (!host) {
    return;
  }

  if (!isDomainAllowed(host, domains)) {
    throw new ForbiddenException(`Domain ${host} is not authorized`);
  }
};

const defaultWidgetConfigFromTenant = (locale: string) => ({
  locale,
  ...defaultWidgetConfig
});

export class WidgetSessionService {
  constructor(private readonly dependencies: WidgetSessionDependencies) {}

  async start(
    rawInput: unknown,
    headers: StartHeaders,
  ): Promise<WidgetSessionStartResponse> {
    const input = this.parseInput(rawInput);
    const tenant = await this.loadTenant(input.agentId);
    const domains = await this.dependencies.tenantDomains.listByTenantId(tenant.id);

    if (domains.length === 0) {
      throw new ForbiddenException("Tenant has no authorized domains");
    }

    const originHost = extractHostname(headers.origin);
    const refererHost = extractHostname(headers.referer);
    const contextHost = extractHostname(input.context.url);

    validateHostIfPresent(originHost, domains);
    validateHostIfPresent(refererHost, domains);
    validateHostIfPresent(contextHost, domains);

    const visitorId = input.visitorId ?? randomUUID();
    const session = await this.resolveSession(tenant.id, visitorId, input);
    const conversation = await this.resolveConversation(tenant.id, session.id, input);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.dependencies.widgetTokenTtlSeconds;

    return {
      accessToken: createWidgetAccessToken(
        {
          scope: "widget",
          tenantId: tenant.id,
          visitorId,
          sessionId: session.id,
          conversationId: conversation.id,
          issuedAt,
          expiresAt
        },
        this.dependencies.widgetTokenSecret,
      ),
      expiresInSeconds: this.dependencies.widgetTokenTtlSeconds,
      visitorId,
      sessionId: session.id,
      conversationId: conversation.id,
      tenant: {
        id: tenant.id,
        publicId: tenant.publicId,
        name: tenant.name
      },
      config: defaultWidgetConfigFromTenant(tenant.defaultLocale)
    };
  }

  private parseInput(rawInput: unknown): WidgetSessionStartRequest {
    try {
      return widgetSessionStartRequestSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid widget session payload");
    }
  }

  private async loadTenant(publicId: string): Promise<TenantRecord> {
    const tenant = await this.dependencies.tenants.findByPublicId(publicId);

    if (!tenant) {
      throw new NotFoundException(`Tenant ${publicId} was not found`);
    }

    if (tenant.status !== "active") {
      throw new ForbiddenException(`Tenant ${publicId} is not active`);
    }

    return tenant;
  }

  private async resolveSession(
    tenantId: string,
    visitorId: string,
    input: WidgetSessionStartRequest,
  ): Promise<VisitorSessionRecord> {
    if (input.sessionId) {
      const existingById = await this.dependencies.visitorSessions.findById(input.sessionId);
      if (existingById?.tenantId === tenantId) {
        const updated = await this.dependencies.visitorSessions.touch(existingById.id, input.context);
        return updated ?? existingById;
      }
    }

    const existingByVisitor = await this.dependencies.visitorSessions.findLatestByTenantAndVisitor(
      tenantId,
      visitorId,
    );

    if (existingByVisitor) {
      const updated = await this.dependencies.visitorSessions.touch(existingByVisitor.id, input.context);
      return updated ?? existingByVisitor;
    }

    return this.dependencies.visitorSessions.create({
      id: input.sessionId,
      tenantId,
      visitorId,
      pageContext: input.context
    });
  }

  private async resolveConversation(
    tenantId: string,
    sessionId: string,
    input: WidgetSessionStartRequest,
  ): Promise<ConversationRecord> {
    if (input.conversationId) {
      const existingById = await this.dependencies.conversations.findById(input.conversationId);
      if (existingById?.tenantId === tenantId && existingById.sessionId === sessionId) {
        return existingById;
      }
    }

    const existingBySession = await this.dependencies.conversations.findLatestBySessionId(sessionId);
    if (existingBySession) {
      return existingBySession;
    }

    return this.dependencies.conversations.create({
      id: input.conversationId,
      tenantId,
      sessionId
    });
  }
}
