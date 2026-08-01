import { BadRequestException } from "@nestjs/common";
import type { AgentAdapter, AgentProvider, AgentRouteInput, AgentRouteResult, TenantAgentConfigRecord } from "./agent-adapter.js";

const defaultProvider: AgentProvider = "n8n";

type TenantAgentConfigsRepository = Readonly<{
  findLatestByTenantId(tenantId: string): Promise<TenantAgentConfigRecord | null>;
}>;

export type AgentRouterServiceDependencies = Readonly<{
  tenantAgentConfigs: TenantAgentConfigsRepository;
  adapters: Readonly<Record<AgentProvider, AgentAdapter>>;
  fallbackProvider?: AgentProvider;
}>;

export class AgentRouterService {
  constructor(private readonly dependencies: AgentRouterServiceDependencies) {}

  async route(input: AgentRouteInput): Promise<AgentRouteResult> {
    if (!input.tenantId) {
      throw new BadRequestException("Tenant is required for agent routing");
    }

    const agentConfig = await this.dependencies.tenantAgentConfigs.findLatestByTenantId(input.tenantId);
    const resolvedProvider = this.resolveProvider(agentConfig?.provider, agentConfig?.isActive ?? false);
    const adapter = this.resolveAdapter(resolvedProvider);

    return adapter.route({
      ...input,
      agentConfig
    });
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
}
