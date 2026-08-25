import type { AgentProvider, TenantStatus } from "./tenants.js";

export type AdminUser = Readonly<{
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
}>;

export type AdminSession = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: AdminUser;
}>;

export type PlatformHealthRecord = Readonly<{
  status: "ok";
  service: "api";
  timestamp: string;
  checks: Readonly<{
    database: "ok";
  }>;
}>;

export type TenantRecord = Readonly<{
  id: string;
  publicId: string;
  name: string;
  status: TenantStatus;
  planId: string;
  defaultLocale: string;
  deletedAt: string | null;
}>;

export type TenantDomainRecord = Readonly<{
  id: string;
  tenantId: string;
  domain: string;
  isVerified: boolean;
  createdAt?: string;
}>;

export type TenantConfigRecord = Readonly<{
  tenantId: string;
  theme: "light" | "dark" | "auto";
  primaryColor: string;
  iconUrl: string | null;
  initialMessage: string;
  placeholder: string;
}>;

export type TenantConfigPayload = Readonly<{
  theme?: "light" | "dark" | "auto";
  primaryColor?: string;
  iconUrl?: string | null;
  initialMessage?: string;
  placeholder?: string;
}>;

export type TenantAgentConfigRecord = Readonly<{
  id?: string;
  tenantId: string;
  provider: AgentProvider;
  model: string | null;
  webhookEndpointId: string | null;
  encryptedCredentialsRef: string | null;
  routingRules: Record<string, unknown>;
  timeoutMs: number;
  retryPolicy: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}>;

export type TenantAgentConfigPayload = Readonly<{
  provider: TenantAgentConfigRecord["provider"];
  model?: string | null;
  webhookEndpointId?: string | null;
  encryptedCredentialsRef?: string | null;
  routingRules?: Record<string, unknown>;
  timeoutMs?: number;
  retryPolicy?: Record<string, unknown>;
  isActive?: boolean;
}>;

export type TenantUserRecord = Readonly<{
  id: string;
  tenantId: string;
  email: string;
  status: "active" | "invited" | "suspended";
  roles: string[];
  invitedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}>;

export type TenantRoleRecord = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}>;

export type TenantApiKeyRecord = Readonly<{
  id: string;
  name: string;
  prefix: string;
  last4: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}>;

export type TenantAnalyticsEventRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}>;

export type TenantCountRecord = Readonly<{
  value: string;
  count: number;
}>;

export type TenantAnalyticsReport = Readonly<{
  totalEvents: number;
  eventTypeCounts: TenantCountRecord[];
  originCounts: TenantCountRecord[];
  domainCounts: TenantCountRecord[];
  deviceCounts: TenantCountRecord[];
  resolutionCounts: TenantCountRecord[];
  timeline: TenantCountRecord[];
  events: TenantAnalyticsEventRecord[];
}>;

export type TenantAuditLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  actorUserEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type TenantSystemLogRecord = Readonly<{
  id: string;
  tenantId: string | null;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  correlationId: string | null;
  context: Record<string, unknown>;
  createdAt: string;
}>;

export type TenantConversationMessageRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  providerMessageId: string | null;
  createdAt: string;
}>;

export type TenantConversationRecord = Readonly<{
  id: string;
  tenantId: string;
  sessionId: string;
  status: "open" | "closed";
  startedAt: string;
  endedAt: string | null;
  visitorId: string | null;
  lastSeenAt: string | null;
  currentPage: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  messageCount: number;
  lastMessageAt: string | null;
}>;

export type TenantConversationDetailRecord = TenantConversationRecord &
  Readonly<{
    messages: TenantConversationMessageRecord[];
  }>;

export type TenantSessionRecord = Readonly<{
  id: string;
  tenantId: string;
  visitorId: string;
  startedAt: string | null;
  lastSeenAt: string | null;
  currentPage: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  referrer: string | null;
  conversationId: string | null;
  conversationStatus: "open" | "closed" | null;
}>;

export type InviteTenantUserPayload = Readonly<{
  email: string;
  roleSlug: string;
}>;

export type UpdateTenantUserRolesPayload = Readonly<{
  roleSlugs: string[];
}>;

export type UpdateTenantUserStatusPayload = Readonly<{
  status: TenantUserRecord["status"];
}>;

export type CreateTenantApiKeyPayload = Readonly<{
  name: string;
}>;

export type CreateTenantApiKeyResponse = TenantApiKeyRecord &
  Readonly<{
    secret: string;
  }>;

export type PlanRecord = Readonly<{
  id: string;
  slug: string;
  name: string;
  limits: Record<string, unknown>;
  priceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type LoginPayload = Readonly<{
  email: string;
  password: string;
}>;

export type CreateTenantPayload = Readonly<{
  publicId: string;
  name: string;
  planId: string;
  defaultLocale: string;
}>;

export type UpdateTenantPayload = {
  publicId?: string;
  name?: string;
  planId?: string | null;
  defaultLocale?: string;
  status?: TenantStatus;
};

export type CreatePlanPayload = Readonly<{
  slug: string;
  name: string;
  priceCents?: number;
  limits?: Record<string, unknown>;
}>;

export type UpdatePlanPayload = Partial<{
  slug: string;
  name: string;
  priceCents: number;
  limits: Record<string, unknown>;
  isActive: boolean;
}>;
