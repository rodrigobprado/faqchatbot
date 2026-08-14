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

export type TenantRecord = Readonly<{
  id: string;
  publicId: string;
  name: string;
  status: "active" | "inactive" | "suspended";
  planId: string;
  defaultLocale: string;
  deletedAt: string | null;
}>;

export type LoginPayload = Readonly<{
  email: string;
  password: string;
}>;

export type CreateTenantPayload = Readonly<{
  publicId: string;
  name: string;
  planSlug: "free" | "starter" | "growth" | "enterprise";
  defaultLocale: string;
}>;

export type UpdateTenantPayload = {
  publicId?: string;
  name?: string;
  planSlug?: "free" | "starter" | "growth" | "enterprise";
  defaultLocale?: string;
  status?: "active" | "inactive" | "suspended";
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

export const listTenants = (accessToken: string): Promise<TenantRecord[]> =>
  requestJson<TenantRecord[]>("/v1/admin/tenants", {}, accessToken);

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

const escapeAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const buildWidgetSnippet = (publicId: string): string => {
  const escapedPublicId = escapeAttribute(publicId);
  return `<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=${escapedPublicId}" data-agent="${escapedPublicId}" async></script>`;
};
