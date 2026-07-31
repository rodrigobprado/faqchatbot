import type { AgentProvider } from "@faqchatbot/contracts";
import { createLogger } from "@faqchatbot/logger";
import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "../../db/client.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createWebhookEndpointsRepository } from "../../db/repositories/webhook-endpoints.repository.js";
import { DATABASE } from "../core/core.module.js";
import { AgentRoutingError, type AgentAdapter, type AgentRequest, type AgentResponse } from "./agent-adapter.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import { N8nAgentAdapter } from "./n8n-agent.adapter.js";

const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 30_000;
const DEFAULT_RETRY = { maxAttempts: 1, backoffMs: 200 };

type RetryPolicy = typeof DEFAULT_RETRY;

const parseRetryPolicy = (raw: unknown): RetryPolicy => {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_RETRY;
  }

  const candidate = raw as { maxAttempts?: unknown; backoffMs?: unknown };
  return {
    maxAttempts:
      typeof candidate.maxAttempts === "number" && candidate.maxAttempts > 0
        ? candidate.maxAttempts
        : DEFAULT_RETRY.maxAttempts,
    backoffMs:
      typeof candidate.backoffMs === "number" && candidate.backoffMs >= 0
        ? candidate.backoffMs
        : DEFAULT_RETRY.backoffMs
  };
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Injectable()
export class AgentRouterService {
  private readonly adapters: ReadonlyMap<AgentProvider, AgentAdapter>;
  private readonly breaker = new CircuitBreaker({
    failureThreshold: BREAKER_FAILURE_THRESHOLD,
    cooldownMs: BREAKER_COOLDOWN_MS
  });
  private readonly logger = createLogger("agent-router");

  constructor(@Inject(DATABASE) private readonly db: Database) {
    this.adapters = new Map<AgentProvider, AgentAdapter>([["n8n", new N8nAgentAdapter()]]);
  }

  async route(request: AgentRequest): Promise<AgentResponse> {
    const config = await createTenantAgentConfigsRepository(this.db).findByTenantId(request.tenantId);
    if (!config || !config.isActive) {
      throw new AgentRoutingError("No active agent configured for this tenant");
    }

    const adapter = this.adapters.get(config.provider);
    if (!adapter) {
      throw new AgentRoutingError(`No adapter available for provider "${config.provider}"`);
    }

    const breakerKey = `${request.tenantId}:${config.provider}`;
    if (this.breaker.isOpen(breakerKey)) {
      this.logger.warn("agent_routing_circuit_open", { tenantId: request.tenantId, provider: config.provider });
      throw new AgentRoutingError("Agent temporarily unavailable");
    }

    const webhook = config.webhookEndpointId
      ? await createWebhookEndpointsRepository(this.db).findById(config.webhookEndpointId)
      : null;
    const retryPolicy = parseRetryPolicy(config.retryPolicy);

    await this.recordEvent(request, "AgentRoutingStarted", { provider: config.provider });

    let lastError: unknown;
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
      try {
        const response = await adapter.send(request, config, webhook);
        this.breaker.recordSuccess(breakerKey);
        this.logger.info("agent_routing_succeeded", {
          tenantId: request.tenantId,
          provider: config.provider,
          attempt
        });
        return response;
      } catch (error) {
        lastError = error;
        this.logger.warn("agent_routing_attempt_failed", {
          tenantId: request.tenantId,
          provider: config.provider,
          attempt,
          reason: error instanceof Error ? error.message : "unknown"
        });

        if (attempt < retryPolicy.maxAttempts) {
          await delay(retryPolicy.backoffMs);
        }
      }
    }

    this.breaker.recordFailure(breakerKey);
    await this.recordEvent(request, "AgentRoutingFailed", {
      provider: config.provider,
      reason: (lastError instanceof Error ? lastError.message : "unknown").slice(0, 500)
    });

    throw new AgentRoutingError("Agent request failed");
  }

  private async recordEvent(
    request: AgentRequest,
    eventType: "AgentRoutingStarted" | "AgentRoutingFailed",
    extra: Record<string, unknown>,
  ): Promise<void> {
    await createAnalyticsEventsRepository(this.db).record({
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      eventType,
      payload: {
        type: eventType,
        tenantId: request.tenantId,
        conversationId: request.conversationId,
        occurredAt: new Date().toISOString(),
        ...extra
      }
    });
  }
}
