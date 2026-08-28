import type {
  CreateTenantDomainRequest,
  CreateTenantRequest,
  TenantAgentConfigRequest,
  TenantConfigRequest,
  UpdateTenantRequest
} from "@faqchatbot/contracts";
import { createHash, randomBytes } from "node:crypto";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { hashPassword } from "../../auth/password.js";
import type { Database } from "../../db/client.js";
import type { conversations } from "../../db/schema.js";
import { createAnalyticsEventsRepository, type AnalyticsPeriod } from "../../db/repositories/analytics-events.repository.js";
import { createApiKeysRepository } from "../../db/repositories/api-keys.repository.js";
import { createAuditLogsRepository } from "../../db/repositories/audit-logs.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createMessagesRepository } from "../../db/repositories/messages.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createPermissionsRepository } from "../../db/repositories/permissions.repository.js";
import { createRolePermissionsRepository } from "../../db/repositories/role-permissions.repository.js";
import { createRolesRepository } from "../../db/repositories/roles.repository.js";
import { createSystemLogsRepository } from "../../db/repositories/system-logs.repository.js";
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
import { buildVerificationRecordName, verifyDomainOwnership } from "./domain-verification.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createWebhookEndpointsRepository } from "../../db/repositories/webhook-endpoints.repository.js";
import { DATABASE } from "../core/core.module.js";
import { resolveRateLimitPolicy } from "../rate-limit/rate-limit-policy.js";

const RATE_LIMIT_SCOPES: readonly RateLimitScope[] = ["ip", "tenant", "api_key", "visitor", "conversation"];
const DEFAULT_ANALYTICS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

type ConversationRow = typeof conversations.$inferSelect;

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

  async verifyDomain(tenantId: string, domainId: string) {
    await this.get(tenantId);
    const domainsRepository = createTenantDomainsRepository(this.db);
    const domain = await domainsRepository.findById(domainId);

    if (!domain || domain.tenantId !== tenantId) {
      throw new NotFoundException("Domain not found");
    }

    if (domain.isVerified) {
      return domain;
    }

    const owned = await verifyDomainOwnership(domain.domain, domain.verificationToken);

    if (!owned) {
      throw new ConflictException(
        `Registro TXT nao encontrado. Adicione ${buildVerificationRecordName(domain.domain)} com o valor ${domain.verificationToken}.`,
      );
    }

    const verified = await domainsRepository.markVerified(domainId);

    if (!verified) {
      throw new NotFoundException("Domain not found");
    }

    return verified;
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
    const conversations = await createConversationsRepository(this.db).listByTenantId(tenantId, page);
    return Promise.all(
      conversations.map((conversation) => this.summarizeConversation(tenantId, conversation)),
    );
  }

  private async summarizeConversation(tenantId: string, conversation: ConversationRow) {
    const [session, messages] = await Promise.all([
      createVisitorSessionsRepository(this.db).findById(conversation.sessionId),
      createMessagesRepository(this.db).listByConversationAndTenantId(conversation.id, tenantId)
    ]);

    const pageContext = (session?.pageContext ?? {}) as { url?: unknown; title?: unknown };
    const lastMessage = messages.at(-1);

    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      sessionId: conversation.sessionId,
      status: conversation.status,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt?.toISOString() ?? null,
      visitorId: session?.visitorId ?? null,
      lastSeenAt: session?.lastSeenAt?.toISOString() ?? null,
      currentPage: typeof pageContext.url === "string" ? pageContext.url : null,
      pageTitle: typeof pageContext.title === "string" ? pageContext.title : null,
      pageUrl: typeof pageContext.url === "string" ? pageContext.url : null,
      messageCount: messages.length,
      lastMessageAt: lastMessage?.createdAt.toISOString() ?? null
    };
  }

  async listSessions(tenantId: string, page: { limit?: number; offset?: number }) {
    await this.get(tenantId);
    return createVisitorSessionsRepository(this.db).listByTenantId(tenantId, page);
  }

  async listAuditLogs(tenantId: string, page: { limit?: number; offset?: number }) {
    await this.get(tenantId);
    return createAuditLogsRepository(this.db).listByTenantId(tenantId, page);
  }

  listSystemLogs(filter: {
    tenantId?: string;
    level?: "debug" | "info" | "warn" | "error";
    limit?: number;
    offset?: number;
  }) {
    return createSystemLogsRepository(this.db).list(filter);
  }

  async listTenantSystemLogs(tenantId: string) {
    await this.get(tenantId);
    return createSystemLogsRepository(this.db).list({ tenantId });
  }

  listPlans() {
    return createPlansRepository(this.db).list();
  }

  async listApiKeys(tenantId: string, _actorUserId?: string | null) {
    await this.get(tenantId);
    const keys = await createApiKeysRepository(this.db).listByTenantId(tenantId);
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      last4: key.last4,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString()
    }));
  }

  async createApiKey(tenantId: string, name: string, actorUserId: string | null) {
    await this.get(tenantId);

    const secret = `fqc_${randomBytes(24).toString("hex")}`;
    const prefix = secret.slice(0, 12);
    const hashedKey = createHash("sha256").update(secret).digest("hex");

    const key = await createApiKeysRepository(this.db).create({
      tenantId,
      name,
      hashedKey,
      prefix,
      last4: secret.slice(-4)
    });

    await createAuditLogsRepository(this.db).create({
      tenantId,
      actorUserId,
      action: "api_key.created",
      targetType: "api_key",
      targetId: key.id,
      metadata: { name }
    });

    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      last4: key.last4,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: key.createdAt.toISOString(),
      secret
    };
  }

  async revokeApiKey(tenantId: string, apiKeyId: string, actorUserId: string | null) {
    await this.get(tenantId);

    const existing = await createApiKeysRepository(this.db).findByIdAndTenantId(apiKeyId, tenantId);
    if (!existing) {
      throw new NotFoundException("API key not found");
    }

    const revoked = await createApiKeysRepository(this.db).revoke(apiKeyId);

    if (!revoked) {
      throw new NotFoundException("API key not found");
    }

    await createAuditLogsRepository(this.db).create({
      tenantId,
      actorUserId,
      action: "api_key.revoked",
      targetType: "api_key",
      targetId: revoked.id,
      metadata: { name: revoked.name }
    });

    return {
      id: revoked.id,
      name: revoked.name,
      prefix: revoked.prefix,
      last4: revoked.last4,
      lastUsedAt: revoked.lastUsedAt?.toISOString() ?? null,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
      createdAt: revoked.createdAt.toISOString()
    };
  }

  async getConversationDetail(tenantId: string, conversationId: string) {
    await this.get(tenantId);

    const conversation = await createConversationsRepository(this.db).findByIdAndTenantId(
      conversationId,
      tenantId,
    );

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const [summary, messages] = await Promise.all([
      this.summarizeConversation(tenantId, conversation),
      createMessagesRepository(this.db).listByConversationAndTenantId(conversationId, tenantId)
    ]);

    return {
      ...summary,
      messages: messages.map((message) => ({
        id: message.id,
        tenantId: message.tenantId,
        role: message.role,
        type: message.type,
        content: message.content,
        createdAt: message.createdAt.toISOString()
      }))
    };
  }

  async updateUserStatus(
    tenantId: string,
    userId: string,
    status: "active" | "invited" | "suspended",
    actorUserId: string | null,
  ) {
    await this.get(tenantId);

    const user = await createUsersRepository(this.db).findByIdAndTenantId(userId, tenantId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await createUsersRepository(this.db).updateStatus(userId, status);

    if (!updated) {
      throw new NotFoundException("User not found");
    }

    await createAuditLogsRepository(this.db).create({
      tenantId,
      actorUserId,
      action: "user.status_changed",
      targetType: "user",
      targetId: userId,
      metadata: { status }
    });

    return this.toTenantUserRecord(updated.id, updated);
  }

  async updateUserRoles(tenantId: string, userId: string, roleSlugs: readonly string[], actorUserId: string | null) {
    await this.get(tenantId);

    const user = await createUsersRepository(this.db).findByIdAndTenantId(userId, tenantId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const roles = createRolesRepository(this.db);
    const roleIds: string[] = [];
    for (const slug of roleSlugs) {
      const role = await roles.findBySlugForTenant(tenantId, slug);
      if (!role) {
        throw new NotFoundException(`Role "${slug}" not found`);
      }
      roleIds.push(role.id);
    }

    await createUserRolesRepository(this.db).replaceRoles(userId, roleIds);

    await createAuditLogsRepository(this.db).create({
      tenantId,
      actorUserId,
      action: "user.roles_changed",
      targetType: "user",
      targetId: userId,
      metadata: { roleSlugs }
    });

    return this.toTenantUserRecord(userId, user);
  }

  private async toTenantUserRecord(
    userId: string,
    fallback: { id: string; tenantId: string; email: string; status: string },
  ) {
    const roles = await createUserRolesRepository(this.db).listRoleSlugsByUserId(userId);

    return {
      id: fallback.id,
      tenantId: fallback.tenantId,
      email: fallback.email,
      status: fallback.status as "active" | "invited" | "suspended",
      roles,
      invitedAt: null,
      createdAt: null,
      updatedAt: null
    };
  }

  async listUsers(tenantId: string) {
    await this.get(tenantId);
    const users = await createUsersRepository(this.db).listByTenantId(tenantId);
    const userRoles = createUserRolesRepository(this.db);

    return Promise.all(
      users.map(async (user) => {
        const roleSlugs = await userRoles.listRoleSlugsByUserId(user.id);
        return {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roleSlugs,
          roles: roleSlugs
        };
      }),
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
