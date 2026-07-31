import type {
  CreateTenantDomainRequest,
  CreateTenantRequest,
  TenantAgentConfigRequest,
  TenantConfigRequest,
  UpdateTenantRequest
} from "@faqchatbot/contracts";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Database } from "../../db/client.js";
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
}
