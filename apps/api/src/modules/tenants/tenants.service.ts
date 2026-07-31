import type {
  CreateTenantDomainRequest,
  CreateTenantRequest,
  TenantAgentConfigRequest,
  TenantConfigRequest,
  UpdateTenantRequest
} from "@faqchatbot/contracts";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { hashPassword } from "../../auth/password.js";
import type { Database } from "../../db/client.js";
import { createAnalyticsEventsRepository, type AnalyticsPeriod } from "../../db/repositories/analytics-events.repository.js";
import { createAuditLogsRepository } from "../../db/repositories/audit-logs.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createPermissionsRepository } from "../../db/repositories/permissions.repository.js";
import { createRolePermissionsRepository } from "../../db/repositories/role-permissions.repository.js";
import { createRolesRepository } from "../../db/repositories/roles.repository.js";
import { createUserRolesRepository } from "../../db/repositories/user-roles.repository.js";
import { createUsersRepository } from "../../db/repositories/users.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import {
  createRateLimitPoliciesRepository,
  type RateLimitScope
} from "../../db/repositories/rate-limit-policies.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createTenantConfigsRepository } from "../../db/repositories/tenant-configs.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createWebhookEndpointsRepository } from "../../db/repositories/webhook-endpoints.repository.js";
import { DATABASE } from "../core/core.module.js";
import { resolveRateLimitPolicy } from "../rate-limit/rate-limit-policy.js";

const RATE_LIMIT_SCOPES: readonly RateLimitScope[] = ["ip", "tenant", "api_key", "visitor", "conversation"];
const DEFAULT_ANALYTICS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class TenantsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  create(input: CreateTenantRequest) {
    return createTenantsRepository(this.db).create(input);
  }

  list() {
    return createTenantsRepository(this.db).list();
  }

  async get(id: string) {
    const tenant = await createTenantsRepository(this.db).findById(id);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return tenant;
  }

  async update(id: string, input: UpdateTenantRequest) {
    await this.get(id);
    return createTenantsRepository(this.db).update(id, input);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await createTenantsRepository(this.db).softDelete(id);
  }

  async addDomain(tenantId: string, input: CreateTenantDomainRequest) {
    await this.get(tenantId);
    return createTenantDomainsRepository(this.db).create({ tenantId, domain: input.domain });
  }

  async listDomains(tenantId: string) {
    await this.get(tenantId);
    return createTenantDomainsRepository(this.db).listByTenantId(tenantId);
  }

  async removeDomain(tenantId: string, domainId: string): Promise<void> {
    await this.get(tenantId);
    await createTenantDomainsRepository(this.db).remove(domainId);
  }

  async upsertConfig(tenantId: string, input: TenantConfigRequest) {
    await this.get(tenantId);
    return createTenantConfigsRepository(this.db).upsert({ tenantId, ...input });
  }

  async getConfig(tenantId: string) {
    await this.get(tenantId);
    return createTenantConfigsRepository(this.db).findByTenantId(tenantId);
  }

  async upsertAgentConfig(tenantId: string, input: TenantAgentConfigRequest) {
    await this.get(tenantId);

    let webhookEndpointId: string | null = null;
    if (input.webhookUrl && input.webhookSecretRef) {
      const endpoint = await createWebhookEndpointsRepository(this.db).create({
        tenantId,
        url: input.webhookUrl,
        secretRef: input.webhookSecretRef
      });
      webhookEndpointId = endpoint.id;
    }

    return createTenantAgentConfigsRepository(this.db).upsert({
      tenantId,
      provider: input.provider,
      model: input.model,
      webhookEndpointId,
      timeoutMs: input.timeoutMs,
      retryPolicy: input.retryPolicy
    });
  }

  async getAgentConfig(tenantId: string) {
    await this.get(tenantId);
    return createTenantAgentConfigsRepository(this.db).findByTenantId(tenantId);
  }

  async getRateLimits(tenantId: string) {
    await this.get(tenantId);

    const overrides = await createRateLimitPoliciesRepository(this.db).listByTenantId(tenantId);
    const effective = await Promise.all(
      RATE_LIMIT_SCOPES.map(async (scope) => ({
        scope,
        ...(await resolveRateLimitPolicy(this.db, scope, tenantId))
      })),
    );

    return { overrides, effective };
  }

  async upsertRateLimit(tenantId: string, input: { scope: RateLimitScope; limit: number; windowSeconds: number }) {
    await this.get(tenantId);
    return createRateLimitPoliciesRepository(this.db).upsert({ tenantId, ...input });
  }

  async getAnalytics(tenantId: string, period: Partial<AnalyticsPeriod>) {
    await this.get(tenantId);

    const range: AnalyticsPeriod = {
      from: period.from ?? new Date(Date.now() - DEFAULT_ANALYTICS_PERIOD_MS),
      to: period.to ?? new Date()
    };
    const events = createAnalyticsEventsRepository(this.db);

    const [totalsByEventType, averageResponseTimeMs, averageConversationDurationMs] = await Promise.all([
      events.aggregateByEventType(tenantId, range),
      events.averageDurationMs(tenantId, "AgentRoutingCompleted", range),
      events.averageDurationMs(tenantId, "ConversationEnded", range)
    ]);

    return { period: range, totalsByEventType, averageResponseTimeMs, averageConversationDurationMs };
  }

  async listConversations(tenantId: string, page: { limit?: number; offset?: number }) {
    await this.get(tenantId);
    return createConversationsRepository(this.db).listByTenantId(tenantId, page);
  }

  async listSessions(tenantId: string, page: { limit?: number; offset?: number }) {
    await this.get(tenantId);
    return createVisitorSessionsRepository(this.db).listByTenantId(tenantId, page);
  }

  async listAuditLogs(tenantId: string, page: { limit?: number; offset?: number }) {
    await this.get(tenantId);
    return createAuditLogsRepository(this.db).listByTenantId(tenantId, page);
  }

  async listUsers(tenantId: string) {
    await this.get(tenantId);
    const users = await createUsersRepository(this.db).listByTenantId(tenantId);
    const userRoles = createUserRolesRepository(this.db);

    return Promise.all(
      users.map(async (user) => ({
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roleSlugs: await userRoles.listRoleSlugsByUserId(user.id)
      })),
    );
  }

  async createUser(tenantId: string, input: { email: string; password: string; roleSlugs?: string[] }) {
    await this.get(tenantId);
    const passwordHash = await hashPassword(input.password);
    const user = await createUsersRepository(this.db).create({ tenantId, email: input.email, passwordHash });

    const roles = createRolesRepository(this.db);
    const userRoles = createUserRolesRepository(this.db);
    for (const slug of input.roleSlugs ?? []) {
      const role = await roles.findBySlugForTenant(tenantId, slug);
      if (role) {
        await userRoles.assign(user.id, role.id);
      }
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async listRoles(tenantId: string) {
    await this.get(tenantId);
    const roles = await createRolesRepository(this.db).listByTenantId(tenantId);
    const rolePermissions = createRolePermissionsRepository(this.db);

    return Promise.all(
      roles.map(async (role) => ({
        ...role,
        permissionSlugs: await rolePermissions.listPermissionSlugsByRoleId(role.id)
      })),
    );
  }

  async createRole(tenantId: string, input: { slug: string; name: string; permissionSlugs?: string[] }) {
    await this.get(tenantId);
    const role = await createRolesRepository(this.db).create({ tenantId, slug: input.slug, name: input.name });

    const permissions = createPermissionsRepository(this.db);
    const rolePermissions = createRolePermissionsRepository(this.db);
    for (const slug of input.permissionSlugs ?? []) {
      const permission = await permissions.findBySlug(slug);
      if (permission) {
        await rolePermissions.assign(role.id, permission.id);
      }
    }

    return role;
  }

  listPermissions() {
    return createPermissionsRepository(this.db).list();
  }
}
