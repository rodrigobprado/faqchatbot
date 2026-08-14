import { BadGatewayException, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { createLogger, type PlatformLogger } from "../../common/logger.js";
import type { AgentAdapter, AgentProvider, AgentRouteInput, AgentRouteResult, TenantAgentConfigRecord } from "./agent-adapter.js";

const defaultProvider: AgentProvider = "n8n";
const defaultRetryAttempts = 3;
const defaultRetryDelayMs = 50;
const defaultTimeoutMs = 15_000;
const defaultFailureThreshold = 3;
const defaultCircuitCooldownMs = 30_000;

type TenantAgentConfigsRepository = Readonly<{
  findLatestByTenantId(tenantId: string): Promise<TenantAgentConfigRecord | null>;
}>;

type RouterFailureState = Readonly<{
  consecutiveFailures: number;
  openUntil: number | null;
}>;

export type AgentRouterServiceDependencies = Readonly<{
  tenantAgentConfigs: TenantAgentConfigsRepository;
  adapters: Readonly<Record<AgentProvider, AgentAdapter>>;
  fallbackProvider?: AgentProvider;
  logger?: PlatformLogger;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  failureThreshold?: number;
  circuitCooldownMs?: number;
}>;

export class AgentRouterService {
  private readonly logger: PlatformLogger;
  private readonly failureState = new Map<AgentProvider, RouterFailureState>();

  constructor(private readonly dependencies: AgentRouterServiceDependencies) {
    this.logger = dependencies.logger ?? createLogger("agent-router");
  }

  async route(input: AgentRouteInput): Promise<AgentRouteResult> {
    if (!input.tenantId) {
      throw new BadRequestException("Tenant is required for agent routing");
    }

    const agentConfig = await this.dependencies.tenantAgentConfigs.findLatestByTenantId(input.tenantId);
    const resolvedProvider = this.resolveProvider(agentConfig?.provider, agentConfig?.isActive ?? false);
    const adapter = this.resolveAdapter(resolvedProvider);
    const timeoutMs = this.resolveTimeoutMs(agentConfig?.timeoutMs);
    const attempts = this.resolveRetryAttempts(agentConfig?.retryPolicy);
    const startedAt = Date.now();

    this.ensureCircuitClosed(resolvedProvider);
    this.loggerForProvider(resolvedProvider).info("agent routing started", {
      provider: resolvedProvider,
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      timeoutMs,
      attempts
    });

    try {
      const response = await this.executeWithRetry(adapter, {
        ...input,
        agentConfig
      }, attempts, timeoutMs, resolvedProvider);
      this.recordSuccess(resolvedProvider);
      this.loggerForProvider(resolvedProvider).info("agent routing completed", {
        provider: resolvedProvider,
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        durationMs: Date.now() - startedAt
      });
      return response;
    } catch (error) {
      this.recordFailure(resolvedProvider, error);
      this.loggerForProvider(resolvedProvider).error("agent routing failed", {
        provider: resolvedProvider,
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "Error"
      });
      throw new BadGatewayException("Agent provider failed");
    }
  }

  private resolveProvider(provider: AgentProvider | undefined, isActive: boolean): AgentProvider {
    if (provider && isActive && provider in this.dependencies.adapters) {
      return provider;
    }

    return this.dependencies.fallbackProvider ?? defaultProvider;
  }

  private resolveAdapter(provider: AgentProvider): AgentAdapter {
    const adapter = this.dependencies.adapters[provider];
    if (!adapter) {
      throw new BadRequestException(`No agent adapter registered for provider ${provider}`);
    }

    return adapter;
  }

  private async executeWithRetry(
    adapter: AgentAdapter,
    input: AgentRouteInput,
    attempts: number,
    timeoutMs: number,
    provider: AgentProvider,
  ): Promise<AgentRouteResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        this.loggerForProvider(provider).debug("agent routing attempt", {
          provider,
          attempt
        });
        return await this.withTimeout(adapter.route(input), timeoutMs, provider);
      } catch (error) {
        lastError = error;
        this.loggerForProvider(provider).warn("agent routing attempt failed", {
          provider,
          attempt,
          errorName: error instanceof Error ? error.name : "Error"
        });

        if (attempt < attempts) {
          await this.delay(this.dependencies.retryDelayMs ?? defaultRetryDelayMs);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Agent provider failed");
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: AgentProvider): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent provider ${provider} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private resolveTimeoutMs(configTimeoutMs?: number): number {
    return configTimeoutMs ?? this.dependencies.timeoutMs ?? defaultTimeoutMs;
  }

  private resolveRetryAttempts(retryPolicy: unknown): number {
    const configured = this.dependencies.retryAttempts;
    if (typeof configured === "number" && Number.isInteger(configured) && configured > 0) {
      return configured;
    }

    if (typeof retryPolicy === "object" && retryPolicy !== null) {
      const record = retryPolicy as Record<string, unknown>;
      const attempts = record.attempts;
      if (typeof attempts === "number" && Number.isInteger(attempts) && attempts > 0) {
        return attempts;
      }
    }

    return defaultRetryAttempts;
  }

  private ensureCircuitClosed(provider: AgentProvider) {
    const state = this.failureState.get(provider);
    if (!state?.openUntil) {
      return;
    }

    if (state.openUntil > Date.now()) {
      throw new ServiceUnavailableException(`Agent provider ${provider} is temporarily unavailable`);
    }

    this.failureState.delete(provider);
  }

  private recordSuccess(provider: AgentProvider) {
    this.failureState.delete(provider);
  }

  private recordFailure(provider: AgentProvider, error: unknown) {
    const current = this.failureState.get(provider) ?? {
      consecutiveFailures: 0,
      openUntil: null
    };
    const consecutiveFailures = current.consecutiveFailures + 1;
    const threshold = this.dependencies.failureThreshold ?? defaultFailureThreshold;
    const openUntil = consecutiveFailures >= threshold
      ? Date.now() + (this.dependencies.circuitCooldownMs ?? defaultCircuitCooldownMs)
      : null;

    this.failureState.set(provider, {
      consecutiveFailures,
      openUntil
    });

    this.loggerForProvider(provider).warn("agent provider failure recorded", {
      provider,
      consecutiveFailures,
      openUntil: openUntil ?? undefined,
      errorName: error instanceof Error ? error.name : "Error"
    });
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loggerForProvider(provider: AgentProvider): PlatformLogger {
    void provider;
    return this.logger;
  }
}
