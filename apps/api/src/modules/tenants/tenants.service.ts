import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { AdminAccessTokenPayload } from "../../auth/admin-token.js";

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
    conversationsPerDay: z.number().int().positive()
  })
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
    | "n8n"
    | "openai_responses"
    | "langgraph"
    | "flowise"
    | "dify"
    | "crewai"
    | "mcp"
    | "custom";
  model: string | null;
  webhookEndpointId: string | null;
  encryptedCredentialsRef: string | null;
  routingRules: unknown;
  timeoutMs: number;
  retryPolicy: unknown;
  isActive: boolean;
}>;

type PlanRecord = Readonly<{
  id: string;
  slug: string;
  name: string;
  limits: unknown;
}>;

export type TenantsServiceDependencies = Readonly<{
  tenants: {
    create(input: { publicId: string; name: string; planId: string; defaultLocale?: string }): Promise<TenantRecord>;
    findById(id: string): Promise<TenantRecord | null>;
    findByPublicId(publicId: string): Promise<TenantRecord | null>;
    list(): Promise<TenantRecord[]>;
    update(
      id: string,
      input: Partial<{ publicId: string; name: string; planId: string; defaultLocale: string; status: "active" | "inactive" | "suspended"; deletedAt: Date | null }>,
    ): Promise<TenantRecord | null>;
    softDelete(id: string): Promise<TenantRecord | null>;
  };
  tenantDomains: {
    create(input: { tenantId: string; domain: string }): Promise<TenantDomainRecord>;
    listByTenantId(tenantId: string): Promise<TenantDomainRecord[]>;
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
        | "n8n"
        | "openai_responses"
        | "langgraph"
        | "flowise"
        | "dify"
        | "crewai"
        | "mcp"
        | "custom";
      model?: string | null;
      webhookEndpointId?: string | null;
      encryptedCredentialsRef?: string | null;
      routingRules?: Record<string, unknown>;
      timeoutMs?: number;
      retryPolicy?: Record<string, unknown>;
      isActive?: boolean;
    }): Promise<TenantAgentConfigRecord>;
  };
  plans: {
    findBySlug(slug: string): Promise<PlanRecord | null>;
    findById(id: string): Promise<PlanRecord | null>;
  };
}>;

const createTenantSchema = z.object({
  publicId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  planSlug: tenantPlanSchema.default("starter"),
  defaultLocale: z.string().min(2).max(20).default("pt-BR")
});

const updateTenantSchema = z.object({
  publicId: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(180).optional(),
  planSlug: tenantPlanSchema.optional(),
  defaultLocale: z.string().min(2).max(20).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional()
});

const createDomainSchema = z.object({
  domain: z.string().min(1).max(255)
});

const tenantConfigSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  primaryColor: z.string().min(1).max(20).default("#2563eb"),
  iconUrl: z.string().url().nullable().optional(),
  initialMessage: z.string().min(1).max(500).default("Ola! Como posso ajudar?"),
  placeholder: z.string().min(1).max(120).default("Digite sua mensagem")
});

const tenantAgentConfigSchema = z.object({
  provider: z.enum(["n8n", "openai_responses", "langgraph", "flowise", "dify", "crewai", "mcp", "custom"]),
  model: z.string().max(120).nullable().optional(),
  webhookEndpointId: z.string().uuid().nullable().optional(),
  encryptedCredentialsRef: z.string().max(255).nullable().optional(),
  routingRules: z.record(z.string(), z.unknown()).default({}),
  timeoutMs: z.number().int().positive().default(15000),
  retryPolicy: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true)
});

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

const isPlatformAdmin = (actor: AdminAccessTokenPayload): boolean => actor.roles.includes("platform_admin");

export class TenantsService {
  constructor(private readonly dependencies: TenantsServiceDependencies) {}

  async listTenants(actor: AdminAccessTokenPayload) {
    if (isPlatformAdmin(actor)) {
      return this.dependencies.tenants.list();
    }

    const tenant = await this.dependencies.tenants.findById(actor.tenantId);
    return tenant ? [tenant] : [];
  }

  async createTenant(actor: AdminAccessTokenPayload, rawInput: unknown) {
    this.assertPlatformAdmin(actor);
    const input = this.parseCreateTenantInput(rawInput);
    const plan = await resolvePlan(this.dependencies.plans, input.planSlug);

    return this.dependencies.tenants.create({
      publicId: input.publicId,
      name: input.name,
      planId: plan.id,
      defaultLocale: input.defaultLocale
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
      status: input.status
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
      placeholder: input.placeholder
    });
  }

  async getTenantAgentConfig(actor: AdminAccessTokenPayload, tenantId: string) {
    this.assertTenantAccess(actor, tenantId);
    return this.dependencies.tenantAgentConfigs.findLatestByTenantId(tenantId);
  }

  async upsertTenantAgentConfig(actor: AdminAccessTokenPayload, tenantId: string, rawInput: unknown) {
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
      isActive: input.isActive
    });
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
      theme: config?.theme === "light" || config?.theme === "dark" || config?.theme === "auto" ? config.theme : "auto",
      primaryColor: config?.primaryColor ?? "#2563eb",
      iconUrl: config?.iconUrl ?? undefined,
      initialMessage: config?.initialMessage ?? "Ola! Como posso ajudar?",
      placeholder: config?.placeholder ?? "Digite sua mensagem",
      limits: this.parsePlanLimits(plan.limits)
    });
  }

  private parsePlanLimits(limits: unknown) {
    const record = typeof limits === "object" && limits !== null ? (limits as Record<string, unknown>) : {};
    return {
      messagesPerMinute: this.readPositiveInteger(record.messagesPerMinute, 30),
      conversationsPerDay: this.readPositiveInteger(record.conversationsPerDay, 200)
    };
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
