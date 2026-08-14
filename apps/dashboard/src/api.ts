import type { AgentProvider, TenantPlan, TenantStatus } from "@faqchatbot/contracts";

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

export type InviteTenantUserPayload = Readonly<{
  email: string;
  roleSlug: string;
}>;

export type UpdateTenantUserRolesPayload = Readonly<{
  roleSlugs: string[];
}>;

export type CreateTenantApiKeyPayload = Readonly<{
  name: string;
}>;

export type CreateTenantApiKeyResponse = TenantApiKeyRecord & Readonly<{
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
  planSlug: TenantPlan;
  defaultLocale: string;
}>;

export type UpdateTenantPayload = {
  publicId?: string;
  name?: string;
  planSlug?: TenantPlan;
  defaultLocale?: string;
  status?: TenantStatus;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = Readonly<{
  data: T;
  meta?: Readonly<{
    correlationId?: string;
  }>;
}>;

const parseResponseBody = async <T>(response: Response): Promise<T> => {
  const json = (await response.json().catch(() => null)) as
    | Envelope<T>
    | Readonly<{ error?: Readonly<{ message?: string; code?: string }> }>
    | null;

  if (!response.ok) {
    const error = json && "error" in json ? json.error : null;
    throw new ApiError(error?.message ?? "Request failed", response.status, error?.code);
  }

  if (!json || !("data" in json)) {
    throw new ApiError("Resposta invalida da API", response.status);
  }

  return json.data;
};

const requestJson = async <T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    }
  });

  return parseResponseBody<T>(response);
};

export const loginAdmin = (payload: LoginPayload): Promise<AdminSession> =>
  requestJson<AdminSession>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const refreshAdmin = (refreshToken: string): Promise<AdminSession> =>
  requestJson<AdminSession>("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });

export const getPlatformHealth = (): Promise<PlatformHealthRecord> =>
  requestJson<PlatformHealthRecord>("/health");

export const listTenants = (accessToken: string): Promise<TenantRecord[]> =>
  requestJson<TenantRecord[]>("/v1/admin/tenants", {}, accessToken);

export const listPlans = (accessToken: string): Promise<PlanRecord[]> =>
  requestJson<PlanRecord[]>("/v1/admin/tenants/plans", {}, accessToken);

export const createTenant = (
  accessToken: string,
  payload: CreateTenantPayload,
): Promise<TenantRecord> =>
  requestJson<TenantRecord>("/v1/admin/tenants", {
    method: "POST",
    body: JSON.stringify(payload)
  }, accessToken);

export const updateTenant = (
  accessToken: string,
  tenantId: string,
  payload: UpdateTenantPayload,
): Promise<TenantRecord> =>
  requestJson<TenantRecord>(`/v1/admin/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, accessToken);

export const deleteTenant = (accessToken: string, tenantId: string): Promise<TenantRecord> =>
  requestJson<TenantRecord>(`/v1/admin/tenants/${tenantId}`, {
    method: "DELETE"
  }, accessToken);

export const listTenantDomains = (
  accessToken: string,
  tenantId: string,
): Promise<TenantDomainRecord[]> =>
  requestJson<TenantDomainRecord[]>(`/v1/admin/tenants/${tenantId}/domains`, {}, accessToken);

export const createTenantDomain = (
  accessToken: string,
  tenantId: string,
  domain: string,
): Promise<TenantDomainRecord> =>
  requestJson<TenantDomainRecord>(`/v1/admin/tenants/${tenantId}/domains`, {
    method: "POST",
    body: JSON.stringify({ domain })
  }, accessToken);

export const getTenantConfig = (
  accessToken: string,
  tenantId: string,
): Promise<TenantConfigRecord | null> =>
  requestJson<TenantConfigRecord | null>(`/v1/admin/tenants/${tenantId}/config`, {}, accessToken);

export const upsertTenantConfig = (
  accessToken: string,
  tenantId: string,
  payload: TenantConfigPayload,
): Promise<TenantConfigRecord> =>
  requestJson<TenantConfigRecord>(`/v1/admin/tenants/${tenantId}/config`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }, accessToken);

export const getTenantAgentConfig = (
  accessToken: string,
  tenantId: string,
): Promise<TenantAgentConfigRecord | null> =>
  requestJson<TenantAgentConfigRecord | null>(`/v1/admin/tenants/${tenantId}/agent-config`, {}, accessToken);

export const upsertTenantAgentConfig = (
  accessToken: string,
  tenantId: string,
  payload: TenantAgentConfigPayload,
): Promise<TenantAgentConfigRecord> =>
  requestJson<TenantAgentConfigRecord>(`/v1/admin/tenants/${tenantId}/agent-config`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }, accessToken);

export const listTenantUsers = (accessToken: string, tenantId: string): Promise<TenantUserRecord[]> =>
  requestJson<TenantUserRecord[]>(`/v1/admin/tenants/${tenantId}/users`, {}, accessToken);

export const inviteTenantUser = (
  accessToken: string,
  tenantId: string,
  payload: InviteTenantUserPayload,
): Promise<TenantUserRecord> =>
  requestJson<TenantUserRecord>(`/v1/admin/tenants/${tenantId}/users`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, accessToken);

export const updateTenantUserRoles = (
  accessToken: string,
  tenantId: string,
  userId: string,
  payload: UpdateTenantUserRolesPayload,
): Promise<TenantUserRecord> =>
  requestJson<TenantUserRecord>(`/v1/admin/tenants/${tenantId}/users/${userId}/roles`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, accessToken);

export const listTenantRoles = (accessToken: string, tenantId: string): Promise<TenantRoleRecord[]> =>
  requestJson<TenantRoleRecord[]>(`/v1/admin/tenants/${tenantId}/roles`, {}, accessToken);

export const listTenantApiKeys = (accessToken: string, tenantId: string): Promise<TenantApiKeyRecord[]> =>
  requestJson<TenantApiKeyRecord[]>(`/v1/admin/tenants/${tenantId}/api-keys`, {}, accessToken);

export const createTenantApiKey = (
  accessToken: string,
  tenantId: string,
  payload: CreateTenantApiKeyPayload,
): Promise<CreateTenantApiKeyResponse> =>
  requestJson<CreateTenantApiKeyResponse>(`/v1/admin/tenants/${tenantId}/api-keys`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, accessToken);

export const revokeTenantApiKey = (
  accessToken: string,
  tenantId: string,
  apiKeyId: string,
): Promise<TenantApiKeyRecord> =>
  requestJson<TenantApiKeyRecord>(`/v1/admin/tenants/${tenantId}/api-keys/${apiKeyId}`, {
    method: "DELETE"
  }, accessToken);

const escapeAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const buildWidgetSnippet = (publicId: string): string => {
  const escapedPublicId = escapeAttribute(publicId);
  return `<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=${escapedPublicId}" data-agent="${escapedPublicId}" async></script>`;
};
