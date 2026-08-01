export type AgentProvider =
  | "n8n"
  | "openai_responses"
  | "langgraph"
  | "flowise"
  | "dify"
  | "crewai"
  | "mcp"
  | "custom";

export type TenantAgentConfigRecord = Readonly<{
  id: string;
  tenantId: string;
  provider: AgentProvider;
  model: string | null;
  webhookEndpointId: string | null;
  encryptedCredentialsRef: string | null;
  routingRules: unknown;
  timeoutMs: number;
  retryPolicy: unknown;
  isActive: boolean;
}>;

export type AgentRouteInput = Readonly<{
  tenantId: string;
  conversationId: string;
  message: Readonly<Record<string, unknown>>;
  agentConfig?: TenantAgentConfigRecord | null;
}>;

export type AgentRouteResult = Readonly<{
  provider: AgentProvider;
  model: string | null;
  providerMessageId: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
}>;

export interface AgentAdapter {
  readonly provider: AgentProvider;
  route(input: AgentRouteInput): Promise<AgentRouteResult>;
}
