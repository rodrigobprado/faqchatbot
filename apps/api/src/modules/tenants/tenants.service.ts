import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { AdminAccessTokenPayload } from "../../auth/admin-token.js";
import { hashPassword } from "../../auth/password.js";

const tenantPlanSchema = z.enum(["free", "starter", "growth", "enterprise"]);
const tenantPublicConfigSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  status: z.enum(["active", "inactive", "suspended"]),
  plan: tenantPlanSchema,
  domain: z.string().min(1).max(255),
  locale: z.string().default("pt-BR"),
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  primaryColor: z.string().default("#2563eb"),
  iconUrl: z.string().url().optional(),
  initialMessage: z.string().max(500).default("Ola! Como posso ajudar?"),
  placeholder: z.string().max(120).default("Digite sua mensagem"),
  limits: z.object({
    messagesPerMinute: z.number().int().positive(),
    conversationsPerDay: z.number().int().positive(),
  }),
});

type TenantPublicResponse = z.infer<typeof tenantPublicConfigSchema>;

type TenantRecord = Readonly<{
  id: string;
  publicId: string;
  name: string;
  status: "active" | "inactive" | "suspended";
  planId: string;
  defaultLocale: string;
  deletedAt: Date | null;
}>;

type TenantDomainRecord = Readonly<{
  id: string;
  tenantId: string;
  domain: string;
  isVerified: boolean;
}>;

type TenantConfigRecord = Readonly<{
  tenantId: string;
  theme: string;
  primaryColor: string;
  iconUrl: string | null;
  initialMessage: string;
  placeholder: string;
}>;

type TenantAgentConfigRecord = Readonly<{
  id: string;
  tenantId: string;
  provider:
    "n8n" | "openai_responses" | "langgraph" | "flowise" | "dify" | "crewai" | "mcp" | "custom";
  model: string | null;
  webhookEndpointId: string | null;
  encryptedCredentialsRef: string | null;
  routingRules: unknown;
  timeoutMs: number;
  retryPolicy: unknown;
  isActive: boolean;
}>;

type TenantUserRecord = Readonly<{
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  status: "active" | "invited" | "suspended";
  createdAt?: Date;
  updatedAt?: Date;
}>;

type TenantRoleRecord = Readonly<{
  id: string;
  tenantId: string | null;
  slug: string;
  name: string;
  createdAt?: Date;
}>;

type TenantApiKeyRecord = Readonly<{
  id: string;
  tenantId: string;
  name: string;
  hashedKey: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt?: Date;
}>;

type VisitorSessionRecord = Readonly<{
  id: string;
  tenantId: string;
  visitorId: string;
  pageContext: unknown;
  lastSeenAt?: Date;
  startedAt?: Date;
}>;

type VisitorSessionSummaryRecord = Readonly<{
  id: string;
  tenantId: string;
  visitorId: string;
  pageContext: unknown;
  lastSeenAt?: Date;
  startedAt?: Date;
}>;

type ConversationRecord = Readonly<{
  id: string;
  tenantId: string;
  sessionId: string;
  status: "open" | "closed";
  startedAt?: Date;
  endedAt?: Date | null;
}>;

type MessageRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: unknown;
  metadata: Record<string, unknown> | null;
  providerMessageId: string | null;
  createdAt: Date;
}>;

type AnalyticsEventRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}>;

type AuditLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}>;

type SystemLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
  createdAt: Date;
}>;

type PlanRecord = Readonly<{
  id: string;
  slug: string;
  name: string;
  limits: unknown;
}>;

export type TenantsServiceDependencies = Readonly<{
  tenants: {
    create(input: {
      publicId: string;
      name: string;
      planId: string;
      defaultLocale?: string;
    }): Promise<TenantRecord>;
    findById(id: string): Promise<TenantRecord | null>;
    findByPublicId(publicId: string): Promise<TenantRecord | null>;
    list(): Promise<TenantRecord[]>;
    update(
      id: string,
      input: Partial<{
        publicId: string;
        name: string;
        planId: string;
        defaultLocale: string;
        status: "active" | "inactive" | "suspended";
        deletedAt: Date | null;
      }>,
    ): Promise<TenantRecord | null>;
    softDelete(id: string): Promise<TenantRecord | null>;
  };
  tenantDomains: {
    create(input: { tenantId: string; domain: string }): Promise<TenantDomainRecord>;
    listByTenantId(tenantId: string): Promise<TenantDomainRecord[]>;
    delete(id: string): Promise<TenantDomainRecord | null>;
  };
  tenantConfigs: {
    findByTenantId(tenantId: string): Promise<TenantConfigRecord | null>;
    upsert(input: {
      tenantId: string;
      theme?: "light" | "dark" | "auto";
      primaryColor?: string;
      iconUrl?: string | null;
      initialMessage?: string;
      placeholder?: string;
    }): Promise<TenantConfigRecord>;
  };
  tenantAgentConfigs: {
    findLatestByTenantId(tenantId: string): Promise<TenantAgentConfigRecord | null>;
    upsert(input: {
      tenantId: string;
      provider:
        "n8n" | "openai_responses" | "langgraph" | "flowise" | "dify" | "crewai" | "mcp" | "custom";
      model?: string | null;
      webhookEndpointId?: string | null;
      encryptedCredentialsRef?: string | null;
      routingRules?: Record<string, unknown>;
      timeoutMs?: number;
      retryPolicy?: Record<string, unknown>;
      isActive?: boolean;
    }): Promise<TenantAgentConfigRecord>;
  };
  users: {
    create(input: {
      tenantId: string;
      email: string;
      passwordHash: string;
      status?: "active" | "invited" | "suspended";
    }): Promise<TenantUserRecord>;
    findById(id: string): Promise<TenantUserRecord | null>;
    findByEmail(email: string): Promise<TenantUserRecord | null>;
    listByTenantId(tenantId: string): Promise<TenantUserRecord[]>;
    updateStatus(
      id: string,
      status: "active" | "invited" | "suspended",
    ): Promise<TenantUserRecord | null>;
  };
  userRoles: {
    assignRole(userId: string, roleId: string): Promise<unknown>;
    removeRolesByUserId(userId: string): Promise<void>;
    listRoleSlugsByUserId(userId: string): Promise<Array<Readonly<{ slug: string }>>>;
  };
  roles: {
    create(input: { tenantId?: string; slug: string; name: string }): Promise<TenantRoleRecord>;
    findByTenantIdAndSlug(
      tenantId: string | null | undefined,
      slug: string,
    ): Promise<TenantRoleRecord | null>;
    listByTenantId(tenantId: string): Promise<TenantRoleRecord[]>;
  };
  apiKeys: {
    create(input: {
      tenantId: string;
      name: string;
      hashedKey: string;
      prefix: string;
    }): Promise<TenantApiKeyRecord>;
    findById(id: string): Promise<TenantApiKeyRecord | null>;
    listByTenantId(tenantId: string): Promise<TenantApiKeyRecord[]>;
    revoke(id: string): Promise<TenantApiKeyRecord | null>;
  };
  visitorSessions: {
    findById(id: string): Promise<VisitorSessionRecord | null>;
    listByTenantId(tenantId: string): Promise<VisitorSessionSummaryRecord[]>;
  };
  conversations: {
    findById(id: string): Promise<ConversationRecord | null>;
    listByTenantId(tenantId: string): Promise<ConversationRecord[]>;
    findLatestBySessionId(sessionId: string): Promise<ConversationRecord | null>;
  };
  messages: {
    listByConversationId(conversationId: string): Promise<MessageRecord[]>;
  };
  analyticsEvents: {
    listByTenantId(tenantId: string): Promise<AnalyticsEventRecord[]>;
  };
  auditLogs: {
    listByTenantId(tenantId: string): Promise<AuditLogRecord[]>;
  };
  systemLogs: {
    listByTenantId(tenantId: string): Promise<SystemLogRecord[]>;
  };
  plans: {
    findBySlug(slug: string): Promise<PlanRecord | null>;
    findById(id: string): Promise<PlanRecord | null>;
    list(): Promise<PlanRecord[]>;
  };
}>;

const createTenantSchema = z.object({
  publicId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  planSlug: tenantPlanSchema.default("starter"),
  defaultLocale: z.string().min(2).max(20).default("pt-BR"),
});

const updateTenantSchema = z.object({
  publicId: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(180).optional(),
  planSlug: tenantPlanSchema.optional(),
  defaultLocale: z.string().min(2).max(20).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

const createDomainSchema = z.object({
  domain: z.string().min(1).max(255),
});

const tenantConfigSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  primaryColor: z.string().min(1).max(20).default("#2563eb"),
  iconUrl: z.string().url().nullable().optional(),
  initialMessage: z.string().min(1).max(500).default("Ola! Como posso ajudar?"),
  placeholder: z.string().min(1).max(120).default("Digite sua mensagem"),
});

const tenantAgentConfigSchema = z.object({
  provider: z.enum([
    "n8n",
    "openai_responses",
    "langgraph",
    "flowise",
    "dify",
    "crewai",
    "mcp",
    "custom",
  ]),
  model: z.string().max(120).nullable().optional(),
  webhookEndpointId: z.string().uuid().nullable().optional(),
  encryptedCredentialsRef: z.string().max(255).nullable().optional(),
  routingRules: z.record(z.string(), z.unknown()).default({}),
  timeoutMs: z.number().int().positive().default(15000),
  retryPolicy: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

const inviteUserSchema = z.object({
  email: z.string().email().max(255),
  roleSlug: z.string().min(1).max(80).default("viewer"),
});

const updateUserRolesSchema = z.object({
  roleSlugs: z.array(z.string().min(1).max(80)).min(1),
});

const updateUserStatusSchema = z.object({
  status: z.enum(["active", "invited", "suspended"]),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
});

const defaultRoleCatalog = [
  {
    slug: "admin",
    name: "Administrator",
    description: "Acesso total ao tenant.",
    permissions: [
      "Visualizar conversas",
      "Responder conversas",
      "Invitar usuarios",
      "Gerenciar roles",
      "Criar api keys",
      "Revogar api keys",
    ],
  },
  {
    slug: "editor",
    name: "Editor",
    description: "Atua no atendimento e na operacao cotidiana.",
    permissions: ["Visualizar conversas", "Responder conversas"],
  },
  {
    slug: "viewer",
    name: "Viewer",
    description: "Acompanha a operacao sem alterar dados.",
    permissions: ["Visualizar conversas"],
  },
  {
    slug: "operator",
    name: "Operator",
    description: "Gerencia integracoes e chaves de API.",
    permissions: ["Visualizar conversas", "Criar api keys", "Revogar api keys"],
  },
] as const;

const resolvePlan = async (
  plans: TenantsServiceDependencies["plans"],
  planSlug: string,
): Promise<PlanRecord> => {
  const plan = await plans.findBySlug(planSlug);
  if (!plan) {
    throw new BadRequestException(`Plan ${planSlug} was not found`);
  }

  return plan;
};

const isPlatformAdmin = (actor: AdminAccessTokenPayload): boolean =>
  actor.roles.includes("platform_admin");

export class TenantsService {
  constructor(private readonly dependencies: TenantsServiceDependencies) {}

  async listTenants(actor: AdminAccessTokenPayload) {
    if (isPlatformAdmin(actor)) {
      return this.dependencies.tenants.list();
    }

    const tenant = await this.dependencies.tenants.findById(actor.tenantId);
    return tenant ? [tenant] : [];
  }

  async listPlans(actor: AdminAccessTokenPayload) {
    this.assertPlatformAdmin(actor);
    return this.dependencies.plans.list();
  }

  async listConversations(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const conversations = await this.dependencies.conversations.listByTenantId(tenantId);

    return Promise.all(
      conversations.map(async (conversation) => {
        const [session, messages] = await Promise.all([
          this.dependencies.visitorSessions.findById(conversation.sessionId),
          this.dependencies.messages.listByConversationId(conversation.id),
        ]);

        return this.serializeConversationSummary(conversation, session, messages);
      }),
    );
  }

  async listSessions(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const sessions = await this.dependencies.visitorSessions.listByTenantId(tenantId);

    return Promise.all(
      sessions.map(async (session) => {
        const conversation = await this.dependencies.conversations.findLatestBySessionId(
          session.id,
        );
        const pageContext =
          typeof session.pageContext === "object" && session.pageContext !== null
            ? (session.pageContext as Record<string, unknown>)
            : {};

        return {
          id: session.id,
          tenantId: session.tenantId,
          visitorId: session.visitorId,
          startedAt: session.startedAt?.toISOString?.() ?? null,
          lastSeenAt: session.lastSeenAt?.toISOString?.() ?? null,
          currentPage: typeof pageContext.currentPage === "string" ? pageContext.currentPage : null,
          pageTitle: typeof pageContext.title === "string" ? pageContext.title : null,
          pageUrl: typeof pageContext.url === "string" ? pageContext.url : null,
          referrer: typeof pageContext.referrer === "string" ? pageContext.referrer : null,
          conversationId: conversation?.id ?? null,
          conversationStatus: conversation?.status ?? null,
        };
      }),
    );
  }

  async getConversation(actor: AdminAccessTokenPayload, tenantId: string, conversationId: string) {
    this.assertTenantAccess(actor, tenantId);
    const conversation = await this.dependencies.conversations.findById(conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new NotFoundException(`Conversation ${conversationId} was not found`);
    }

    const [session, messages] = await Promise.all([
      this.dependencies.visitorSessions.findById(conversation.sessionId),
      this.dependencies.messages.listByConversationId(conversation.id),
    ]);

    return {
      ...this.serializeConversationSummary(conversation, session, messages),
      messages: messages.map((message) => this.serializeMessage(message)),
    };
  }

  async createTenant(actor: AdminAccessTokenPayload, rawInput: unknown) {
    this.assertPlatformAdmin(actor);
    const input = this.parseCreateTenantInput(rawInput);
    const plan = await resolvePlan(this.dependencies.plans, input.planSlug);

    return this.dependencies.tenants.create({
      publicId: input.publicId,
      name: input.name,
      planId: plan.id,
      defaultLocale: input.defaultLocale,
    });
  }

  async getTenant(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const tenant = await this.dependencies.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} was not found`);
    }

    return tenant;
  }

  async updateTenant(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseUpdateTenantInput(rawInput);
    const current = await this.dependencies.tenants.findById(tenantId);
    if (!current) {
      throw new NotFoundException(`Tenant ${tenantId} was not found`);
    }

    const plan = input.planSlug ? await resolvePlan(this.dependencies.plans, input.planSlug) : null;

    const updated = await this.dependencies.tenants.update(tenantId, {
      publicId: input.publicId,
      name: input.name,
      planId: plan?.id,
      defaultLocale: input.defaultLocale,
      status: input.status,
    });

    if (!updated) {
      throw new NotFoundException(`Tenant ${tenantId} was not found`);
    }

    return updated;
  }

  async deleteTenant(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const deleted = await this.dependencies.tenants.softDelete(tenantId);
    if (!deleted) {
      throw new NotFoundException(`Tenant ${tenantId} was not found`);
    }

    return deleted;
  }

  async listDomains(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    return this.dependencies.tenantDomains.listByTenantId(tenantId);
  }

  async createDomain(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseCreateDomainInput(rawInput);
    return this.dependencies.tenantDomains.create({ tenantId, domain: input.domain });
  }

  async deleteDomain(actor: AdminAccessTokenPayload, tenantId: string, domainId: string) {
    this.assertTenantAccess(actor, tenantId);
    const domain = await this.dependencies.tenantDomains.delete(domainId);

    if (!domain || domain.tenantId !== tenantId) {
      throw new NotFoundException(`Domain ${domainId} was not found`);
    }

    return domain;
  }

  async getTenantConfig(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    return this.dependencies.tenantConfigs.findByTenantId(tenantId);
  }

  async upsertTenantConfig(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseTenantConfigInput(rawInput);
    return this.dependencies.tenantConfigs.upsert({
      tenantId,
      theme: input.theme,
      primaryColor: input.primaryColor,
      iconUrl: input.iconUrl ?? null,
      initialMessage: input.initialMessage,
      placeholder: input.placeholder,
    });
  }

  async getTenantAgentConfig(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    return this.dependencies.tenantAgentConfigs.findLatestByTenantId(tenantId);
  }

  async upsertTenantAgentConfig(
    actor: AdminAccessTokenPayload,
    tenantId: string,
    rawInput: unknown,
  ) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseTenantAgentConfigInput(rawInput);
    return this.dependencies.tenantAgentConfigs.upsert({
      tenantId,
      provider: input.provider,
      model: input.model ?? null,
      webhookEndpointId: input.webhookEndpointId ?? null,
      encryptedCredentialsRef: input.encryptedCredentialsRef ?? null,
      routingRules: input.routingRules,
      timeoutMs: input.timeoutMs,
      retryPolicy: input.retryPolicy,
      isActive: input.isActive,
    });
  }

  async listUsers(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const users = await this.dependencies.users.listByTenantId(tenantId);

    return Promise.all(
      users.map(async (user) => ({
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        status: user.status,
        roles: (await this.dependencies.userRoles.listRoleSlugsByUserId(user.id)).map(
          (role) => role.slug,
        ),
        createdAt: user.createdAt?.toISOString?.() ?? undefined,
        updatedAt: user.updatedAt?.toISOString?.() ?? undefined,
      })),
    );
  }

  async inviteUser(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseInviteUserInput(rawInput);
    const role = await this.resolveOrCreateRole(tenantId, input.roleSlug);
    const user = await this.dependencies.users.create({
      tenantId,
      email: input.email,
      passwordHash: hashPassword(`invite-${randomUUID()}`),
      status: "invited",
    });

    await this.dependencies.userRoles.assignRole(user.id, role.id);

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      status: user.status,
      roles: [role.slug],
      invitedAt: user.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async updateUserRoles(
    actor: AdminAccessTokenPayload,
    tenantId: string,
    userId: string,
    rawInput: unknown,
  ) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseUpdateUserRolesInput(rawInput);
    const user = await this.dependencies.users.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException(`User ${userId} was not found`);
    }

    const roles = [];
    for (const slug of input.roleSlugs) {
      roles.push(await this.resolveOrCreateRole(tenantId, slug));
    }

    await this.dependencies.userRoles.removeRolesByUserId(userId);
    await Promise.all(roles.map((role) => this.dependencies.userRoles.assignRole(userId, role.id)));

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      status: user.status,
      roles: roles.map((role) => role.slug),
    };
  }

  async updateUserStatus(
    actor: AdminAccessTokenPayload,
    tenantId: string,
    userId: string,
    rawInput: unknown,
  ) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseUpdateUserStatusInput(rawInput);
    const user = await this.dependencies.users.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException(`User ${userId} was not found`);
    }

    const updated = await this.dependencies.users.updateStatus(userId, input.status);
    if (!updated) {
      throw new NotFoundException(`User ${userId} was not found`);
    }

    const roles = await this.dependencies.userRoles.listRoleSlugsByUserId(userId);

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      email: updated.email,
      status: updated.status,
      roles: roles.map((role) => role.slug),
      createdAt: updated.createdAt?.toISOString?.() ?? undefined,
      updatedAt: updated.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  async listRoles(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    await this.ensureDefaultRoles(tenantId);
    const roles = await this.dependencies.roles.listByTenantId(tenantId);

    return roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: this.roleDescription(role.slug),
      permissions: this.rolePermissions(role.slug),
    }));
  }

  async listApiKeys(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const apiKeys = await this.dependencies.apiKeys.listByTenantId(tenantId);

    return apiKeys.map((apiKey) => ({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      last4: apiKey.prefix.slice(-4),
      lastUsedAt: apiKey.lastUsedAt?.toISOString?.() ?? null,
      revokedAt: apiKey.revokedAt?.toISOString?.() ?? null,
      createdAt: apiKey.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }));
  }

  async listAnalytics(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const events = await this.dependencies.analyticsEvents.listByTenantId(tenantId);

    const normalizedEvents = events.map((event) => ({
      id: event.id,
      tenantId: event.tenantId,
      conversationId: event.conversationId,
      eventType: event.eventType,
      payload: event.payload ?? {},
      createdAt: event.createdAt.toISOString(),
    }));

    const totals = this.summarizeCounts(events, (event) => event.eventType);
    const origins = this.summarizeCounts(events, (event) =>
      this.analyticsValue(event.payload, ["origin", "referrer", "source"]),
    );
    const domains = this.summarizeCounts(
      events,
      (event) =>
        this.analyticsValue(event.payload, ["domain"]) ??
        this.hostFromUrl(this.analyticsValue(event.payload, ["url"])),
    );
    const devices = this.summarizeCounts(events, (event) =>
      this.analyticsValue(event.payload, ["deviceType", "device", "platform"]),
    );
    const resolutions = this.summarizeCounts(
      events,
      (event) =>
        this.analyticsValue(event.payload, ["resolution"]) ??
        this.resolutionFromPayload(event.payload),
    );
    const timeline = this.summarizeCounts(events, (event) =>
      event.createdAt.toISOString().slice(0, 10),
    );

    return {
      totalEvents: events.length,
      eventTypeCounts: totals,
      originCounts: origins,
      domainCounts: domains,
      deviceCounts: devices,
      resolutionCounts: resolutions,
      timeline,
      events: normalizedEvents,
    };
  }

  async listAuditLogs(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const logs = await this.dependencies.auditLogs.listByTenantId(tenantId);

    return Promise.all(
      logs.map(async (log) => {
        const actorUser = log.actorUserId
          ? await this.dependencies.users.findById(log.actorUserId)
          : null;
        const correlationId = this.analyticsValue(log.metadata, [
          "correlationId",
          "correlation_id",
        ]);

        return {
          id: log.id,
          tenantId: log.tenantId,
          actorUserId: log.actorUserId,
          actorUserEmail: actorUser?.email ?? null,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          correlationId: correlationId ?? null,
          metadata: log.metadata ?? {},
          createdAt: log.createdAt.toISOString(),
        };
      }),
    );
  }

  async listSystemLogs(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    const logs = await this.dependencies.systemLogs.listByTenantId(tenantId);

    return logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      level: log.level,
      message: log.message,
      correlationId: this.analyticsValue(log.context, ["correlationId", "correlation_id"]) ?? null,
      context: log.context ?? {},
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async createApiKey(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
    this.assertTenantAccess(actor, tenantId);
    const input = this.parseCreateApiKeyInput(rawInput);
    const secret = `fqc_${randomUUID().replaceAll("-", "")}`;
    const created = await this.dependencies.apiKeys.create({
      tenantId,
      name: input.name,
      hashedKey: hashPassword(secret),
      prefix: secret.slice(0, 8),
    });

    return {
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      last4: secret.slice(-4),
      secret,
      lastUsedAt: created.lastUsedAt?.toISOString?.() ?? null,
      revokedAt: created.revokedAt?.toISOString?.() ?? null,
      createdAt: created.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async revokeApiKey(actor: AdminAccessTokenPayload, tenantId: string, apiKeyId: string) {
    this.assertTenantAccess(actor, tenantId);
    const apiKey = await this.dependencies.apiKeys.findById(apiKeyId);
    if (!apiKey || apiKey.tenantId !== tenantId) {
      throw new NotFoundException(`Api key ${apiKeyId} was not found`);
    }

    const revoked = await this.dependencies.apiKeys.revoke(apiKeyId);
    if (!revoked) {
      throw new NotFoundException(`Api key ${apiKeyId} was not found`);
    }

    return {
      id: revoked.id,
      name: revoked.name,
      prefix: revoked.prefix,
      last4: revoked.prefix.slice(-4),
      lastUsedAt: revoked.lastUsedAt?.toISOString?.() ?? null,
      revokedAt: revoked.revokedAt?.toISOString?.() ?? new Date().toISOString(),
      createdAt: revoked.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async getPublicConfig(publicId: string): Promise<TenantPublicResponse> {
    const tenant = await this.dependencies.tenants.findByPublicId(publicId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${publicId} was not found`);
    }

    const plan = await this.dependencies.plans.findById(tenant.planId);
    if (!plan) {
      throw new NotFoundException(`Plan for tenant ${publicId} was not found`);
    }

    const domains = await this.dependencies.tenantDomains.listByTenantId(tenant.id);
    const config = await this.dependencies.tenantConfigs.findByTenantId(tenant.id);

    return tenantPublicConfigSchema.parse({
      id: tenant.id,
      publicId: tenant.publicId,
      name: tenant.name,
      status: tenant.status,
      plan: tenantPlanSchema.parse(plan.slug),
      domain: domains[0]?.domain ?? tenant.publicId,
      locale: tenant.defaultLocale,
      theme:
        config?.theme === "light" || config?.theme === "dark" || config?.theme === "auto"
          ? config.theme
          : "auto",
      primaryColor: config?.primaryColor ?? "#2563eb",
      iconUrl: config?.iconUrl ?? undefined,
      initialMessage: config?.initialMessage ?? "Ola! Como posso ajudar?",
      placeholder: config?.placeholder ?? "Digite sua mensagem",
      limits: this.parsePlanLimits(plan.limits),
    });
  }

  private parsePlanLimits(limits: unknown) {
    const record =
      typeof limits === "object" && limits !== null ? (limits as Record<string, unknown>) : {};
    return {
      messagesPerMinute: this.readPositiveInteger(record.messagesPerMinute, 30),
      conversationsPerDay: this.readPositiveInteger(record.conversationsPerDay, 200),
    };
  }

  private serializeConversationSummary(
    conversation: ConversationRecord,
    session: VisitorSessionRecord | null,
    messages: MessageRecord[],
  ) {
    const pageContext =
      typeof session?.pageContext === "object" && session.pageContext !== null
        ? (session.pageContext as Record<string, unknown>)
        : {};

    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      sessionId: conversation.sessionId,
      status: conversation.status,
      startedAt: conversation.startedAt?.toISOString?.() ?? new Date().toISOString(),
      endedAt: conversation.endedAt?.toISOString?.() ?? null,
      visitorId: session?.visitorId ?? null,
      lastSeenAt: session?.lastSeenAt?.toISOString?.() ?? null,
      currentPage: typeof pageContext.currentPage === "string" ? pageContext.currentPage : null,
      pageTitle: typeof pageContext.title === "string" ? pageContext.title : null,
      pageUrl: typeof pageContext.url === "string" ? pageContext.url : null,
      messageCount: messages.length,
      lastMessageAt: messages.at(-1)?.createdAt?.toISOString?.() ?? null,
    };
  }

  private serializeMessage(message: MessageRecord) {
    return {
      id: message.id,
      tenantId: message.tenantId,
      conversationId: message.conversationId,
      role: message.role,
      type: message.type,
      content: message.content,
      metadata: message.metadata ?? {},
      providerMessageId: message.providerMessageId,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private analyticsValue(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private hostFromUrl(value: string | null) {
    if (!value) {
      return null;
    }

    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private resolutionFromPayload(payload: Record<string, unknown>) {
    const viewport = payload.viewport;
    if (typeof viewport === "object" && viewport !== null) {
      const record = viewport as Record<string, unknown>;
      const width = record.width;
      const height = record.height;
      if (typeof width === "number" && typeof height === "number") {
        return `${width}x${height}`;
      }
    }

    const width = payload.width;
    const height = payload.height;
    if (typeof width === "number" && typeof height === "number") {
      return `${width}x${height}`;
    }

    return null;
  }

  private summarizeCounts<T>(items: T[], selector: (item: T) => string | null) {
    const counts = new Map<string, number>();

    for (const item of items) {
      const value = selector(item);
      if (!value) {
        continue;
      }

      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 10);
  }

  private readPositiveInteger(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private parseCreateTenantInput(rawInput: unknown) {
    try {
      return createTenantSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid tenant payload");
    }
  }

  private parseUpdateTenantInput(rawInput: unknown) {
    try {
      return updateTenantSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid tenant payload");
    }
  }

  private parseCreateDomainInput(rawInput: unknown) {
    try {
      return createDomainSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid domain payload");
    }
  }

  private parseTenantConfigInput(rawInput: unknown) {
    try {
      return tenantConfigSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid tenant config payload");
    }
  }

  private parseTenantAgentConfigInput(rawInput: unknown) {
    try {
      return tenantAgentConfigSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid tenant agent config payload");
    }
  }

  private parseInviteUserInput(rawInput: unknown) {
    try {
      return inviteUserSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid user payload");
    }
  }

  private parseUpdateUserRolesInput(rawInput: unknown) {
    try {
      return updateUserRolesSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid user roles payload");
    }
  }

  private parseUpdateUserStatusInput(rawInput: unknown) {
    try {
      return updateUserStatusSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid user status payload");
    }
  }

  private parseCreateApiKeyInput(rawInput: unknown) {
    try {
      return createApiKeySchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid api key payload");
    }
  }

  private roleDescription(slug: string) {
    return defaultRoleCatalog.find((role) => role.slug === slug)?.description ?? "Custom role";
  }

  private rolePermissions(slug: string) {
    return [...(defaultRoleCatalog.find((role) => role.slug === slug)?.permissions ?? [])];
  }

  private async ensureDefaultRoles(tenantId: string) {
    const existing = await this.dependencies.roles.listByTenantId(tenantId);
    const missing = defaultRoleCatalog.filter(
      (role) => !existing.some((item) => item.slug === role.slug),
    );

    for (const role of missing) {
      await this.dependencies.roles.create({
        tenantId,
        slug: role.slug,
        name: role.name,
      });
    }
  }

  private async resolveOrCreateRole(tenantId: string, slug: string) {
    await this.ensureDefaultRoles(tenantId);
    const role = await this.dependencies.roles.findByTenantIdAndSlug(tenantId, slug);
    if (!role) {
      throw new NotFoundException(`Role ${slug} was not found`);
    }

    return role;
  }

  private assertPlatformAdmin(actor: AdminAccessTokenPayload) {
    if (!isPlatformAdmin(actor)) {
      throw new ForbiddenException("Platform admin role required");
    }
  }

  private assertTenantAccess(actor: AdminAccessTokenPayload, tenantId: string) {
    if (isPlatformAdmin(actor) || actor.tenantId === tenantId) {
      return;
    }

    throw new ForbiddenException("Tenant access denied");
  }
}
