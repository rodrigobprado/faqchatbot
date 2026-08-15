import type {
  AdminSession,
  AdminUser,
  CreateTenantApiKeyPayload,
  CreateTenantApiKeyResponse,
  CreateTenantPayload,
  InviteTenantUserPayload,
  LoginPayload,
  PlanRecord,
  PlatformHealthRecord,
  TenantAgentConfigPayload,
  TenantAgentConfigRecord,
  TenantAnalyticsReport,
  TenantApiKeyRecord,
  TenantAuditLogRecord,
  TenantConfigPayload,
  TenantConfigRecord,
  TenantConversationDetailRecord,
  TenantConversationRecord,
  TenantCountRecord,
  TenantDomainRecord,
  TenantPlan,
  TenantRecord,
  TenantRoleRecord,
  TenantSessionRecord,
  TenantStatus,
  TenantSystemLogRecord,
  TenantUserRecord,
  UpdateTenantPayload,
  UpdateTenantUserRolesPayload,
  UpdateTenantUserStatusPayload,
} from "@faqchatbot/contracts";

export type {
  AdminSession,
  AdminUser,
  CreateTenantApiKeyPayload,
  CreateTenantApiKeyResponse,
  CreateTenantPayload,
  InviteTenantUserPayload,
  LoginPayload,
  PlanRecord,
  PlatformHealthRecord,
  TenantAgentConfigPayload,
  TenantAgentConfigRecord,
  TenantAnalyticsReport,
  TenantApiKeyRecord,
  TenantAuditLogRecord,
  TenantConfigPayload,
  TenantConfigRecord,
  TenantConversationDetailRecord,
  TenantConversationRecord,
  TenantCountRecord,
  TenantDomainRecord,
  TenantPlan,
  TenantRecord,
  TenantRoleRecord,
  TenantSessionRecord,
  TenantStatus,
  TenantSystemLogRecord,
  TenantUserRecord,
  UpdateTenantPayload,
  UpdateTenantUserRolesPayload,
  UpdateTenantUserStatusPayload,
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
    Envelope<T> | Readonly<{ error?: Readonly<{ message?: string; code?: string }> }> | null;

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
      ...(init.headers ?? {}),
    },
  });

  return parseResponseBody<T>(response);
};

export const loginAdmin = (payload: LoginPayload): Promise<AdminSession> =>
  requestJson<AdminSession>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const refreshAdmin = (refreshToken: string): Promise<AdminSession> =>
  requestJson<AdminSession>("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

export const getPlatformHealth = (): Promise<PlatformHealthRecord> =>
  requestJson<PlatformHealthRecord>("/health");

export const listTenants = (accessToken: string): Promise<TenantRecord[]> =>
  requestJson<TenantRecord[]>("/v1/admin/tenants", {}, accessToken);

export const listPlans = (accessToken: string): Promise<PlanRecord[]> =>
  requestJson<PlanRecord[]>("/v1/admin/tenants/plans", {}, accessToken);

export const listTenantConversations = (
  accessToken: string,
  tenantId: string,
): Promise<TenantConversationRecord[]> =>
  requestJson<TenantConversationRecord[]>(
    `/v1/admin/tenants/${tenantId}/conversations`,
    {},
    accessToken,
  );

export const listTenantSessions = (
  accessToken: string,
  tenantId: string,
): Promise<TenantSessionRecord[]> =>
  requestJson<TenantSessionRecord[]>(`/v1/admin/tenants/${tenantId}/sessions`, {}, accessToken);

export const getTenantConversation = (
  accessToken: string,
  tenantId: string,
  conversationId: string,
): Promise<TenantConversationDetailRecord> =>
  requestJson<TenantConversationDetailRecord>(
    `/v1/admin/tenants/${tenantId}/conversations/${conversationId}`,
    {},
    accessToken,
  );

export const createTenant = (
  accessToken: string,
  payload: CreateTenantPayload,
): Promise<TenantRecord> =>
  requestJson<TenantRecord>(
    "/v1/admin/tenants",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const updateTenant = (
  accessToken: string,
  tenantId: string,
  payload: UpdateTenantPayload,
): Promise<TenantRecord> =>
  requestJson<TenantRecord>(
    `/v1/admin/tenants/${tenantId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const deleteTenant = (accessToken: string, tenantId: string): Promise<TenantRecord> =>
  requestJson<TenantRecord>(
    `/v1/admin/tenants/${tenantId}`,
    {
      method: "DELETE",
    },
    accessToken,
  );

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
  requestJson<TenantDomainRecord>(
    `/v1/admin/tenants/${tenantId}/domains`,
    {
      method: "POST",
      body: JSON.stringify({ domain }),
    },
    accessToken,
  );

export const deleteTenantDomain = (
  accessToken: string,
  tenantId: string,
  domainId: string,
): Promise<TenantDomainRecord> =>
  requestJson<TenantDomainRecord>(
    `/v1/admin/tenants/${tenantId}/domains/${domainId}`,
    {
      method: "DELETE",
    },
    accessToken,
  );

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
  requestJson<TenantConfigRecord>(
    `/v1/admin/tenants/${tenantId}/config`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const getTenantAgentConfig = (
  accessToken: string,
  tenantId: string,
): Promise<TenantAgentConfigRecord | null> =>
  requestJson<TenantAgentConfigRecord | null>(
    `/v1/admin/tenants/${tenantId}/agent-config`,
    {},
    accessToken,
  );

export const upsertTenantAgentConfig = (
  accessToken: string,
  tenantId: string,
  payload: TenantAgentConfigPayload,
): Promise<TenantAgentConfigRecord> =>
  requestJson<TenantAgentConfigRecord>(
    `/v1/admin/tenants/${tenantId}/agent-config`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const listTenantUsers = (
  accessToken: string,
  tenantId: string,
): Promise<TenantUserRecord[]> =>
  requestJson<TenantUserRecord[]>(`/v1/admin/tenants/${tenantId}/users`, {}, accessToken);

export const inviteTenantUser = (
  accessToken: string,
  tenantId: string,
  payload: InviteTenantUserPayload,
): Promise<TenantUserRecord> =>
  requestJson<TenantUserRecord>(
    `/v1/admin/tenants/${tenantId}/users`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const updateTenantUserRoles = (
  accessToken: string,
  tenantId: string,
  userId: string,
  payload: UpdateTenantUserRolesPayload,
): Promise<TenantUserRecord> =>
  requestJson<TenantUserRecord>(
    `/v1/admin/tenants/${tenantId}/users/${userId}/roles`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const updateTenantUserStatus = (
  accessToken: string,
  tenantId: string,
  userId: string,
  payload: UpdateTenantUserStatusPayload,
): Promise<TenantUserRecord> =>
  requestJson<TenantUserRecord>(
    `/v1/admin/tenants/${tenantId}/users/${userId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const listTenantRoles = (
  accessToken: string,
  tenantId: string,
): Promise<TenantRoleRecord[]> =>
  requestJson<TenantRoleRecord[]>(`/v1/admin/tenants/${tenantId}/roles`, {}, accessToken);

export const listTenantApiKeys = (
  accessToken: string,
  tenantId: string,
): Promise<TenantApiKeyRecord[]> =>
  requestJson<TenantApiKeyRecord[]>(`/v1/admin/tenants/${tenantId}/api-keys`, {}, accessToken);

export const listTenantAnalytics = (
  accessToken: string,
  tenantId: string,
): Promise<TenantAnalyticsReport> =>
  requestJson<TenantAnalyticsReport>(`/v1/admin/tenants/${tenantId}/analytics`, {}, accessToken);

export const listTenantAuditLogs = (
  accessToken: string,
  tenantId: string,
): Promise<TenantAuditLogRecord[]> =>
  requestJson<TenantAuditLogRecord[]>(`/v1/admin/tenants/${tenantId}/audit-logs`, {}, accessToken);

export const listTenantSystemLogs = (
  accessToken: string,
  tenantId: string,
): Promise<TenantSystemLogRecord[]> =>
  requestJson<TenantSystemLogRecord[]>(
    `/v1/admin/tenants/${tenantId}/system-logs`,
    {},
    accessToken,
  );

export const createTenantApiKey = (
  accessToken: string,
  tenantId: string,
  payload: CreateTenantApiKeyPayload,
): Promise<CreateTenantApiKeyResponse> =>
  requestJson<CreateTenantApiKeyResponse>(
    `/v1/admin/tenants/${tenantId}/api-keys`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );

export const revokeTenantApiKey = (
  accessToken: string,
  tenantId: string,
  apiKeyId: string,
): Promise<TenantApiKeyRecord> =>
  requestJson<TenantApiKeyRecord>(
    `/v1/admin/tenants/${tenantId}/api-keys/${apiKeyId}`,
    {
      method: "DELETE",
    },
    accessToken,
  );

const escapeAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const buildWidgetSnippet = (publicId: string): string => {
  const escapedPublicId = escapeAttribute(publicId);
  return `<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=${escapedPublicId}" data-agent="${escapedPublicId}" async></script>`;
};
