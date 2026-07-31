declare const __API_URL__: string;

export class ApiError extends Error {
  readonly statusCode: number;
  readonly correlationId?: string;

  constructor(statusCode: number, message: string, correlationId?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.correlationId = correlationId;
  }
}

type Query = Record<string, string | undefined>;

const buildUrl = (path: string, query?: Query): string => {
  const url = new URL(path, __API_URL__);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
};

const request = async <T>(
  method: string,
  path: string,
  token: string | null,
  options?: { body?: unknown; query?: Query },
): Promise<T> => {
  const response = await fetch(buildUrl(path, options?.query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json()) as { data?: T; error?: { statusCode: number; message: string; correlationId: string } };

  if (!response.ok) {
    throw new ApiError(
      payload.error?.statusCode ?? response.status,
      payload.error?.message ?? "Request failed",
      payload.error?.correlationId,
    );
  }

  return payload.data as T;
};

export const createApiClient = (getAccessToken: () => string | null) => ({
  get: <T>(path: string, query?: Query) => request<T>("GET", path, getAccessToken(), { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, getAccessToken(), { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, getAccessToken(), { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, getAccessToken(), { body }),
  delete: <T>(path: string) => request<T>("DELETE", path, getAccessToken())
});

export type ApiClient = ReturnType<typeof createApiClient>;
