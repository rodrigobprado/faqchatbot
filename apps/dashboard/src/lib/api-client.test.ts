import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client.js";

describe("createApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches the bearer token and unwraps the data envelope on GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: "t1" } })
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient(() => "token-123");

    const result = await client.get("/v1/admin/tenants/t1");

    expect(result).toEqual({ id: "t1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(String(url)).toContain("/v1/admin/tenants/t1");
    expect(init.headers.Authorization).toBe("Bearer token-123");
  });

  it("omits the Authorization header when there is no token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: null }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient(() => null);

    await client.post("/v1/auth/login", { email: "a@b.com", password: "12345678" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.com", password: "12345678" });
  });

  it("appends only the defined query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient(() => null);

    await client.get("/v1/admin/tenants/t1/analytics", { from: "2026-01-01", to: undefined });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(String(url)).toContain("from=2026-01-01");
    expect(String(url)).not.toContain("to=");
  });

  it("throws ApiError with the server message on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { statusCode: 403, message: "Forbidden", correlationId: "c1" } })
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient(() => "token");

    await expect(client.get("/v1/admin/tenants")).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
      correlationId: "c1"
    });
  });

  it("returns null for 204 No Content responses without parsing a body", async () => {
    const json = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json });
    vi.stubGlobal("fetch", fetchMock);
    const client = createApiClient(() => "token");

    const result = await client.delete("/v1/admin/tenants/t1/domains/d1");

    expect(result).toBeNull();
    expect(json).not.toHaveBeenCalled();
  });
});
