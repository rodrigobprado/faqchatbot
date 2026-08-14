import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWidgetSnippet,
  deleteTenant,
  createTenant,
  listTenants,
  loginAdmin,
  refreshAdmin,
  updateTenant
} from "./api.js";

const session = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresInSeconds: 900,
  user: {
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@acme.test",
    roles: ["platform_admin"]
  }
};

const tenant = {
  id: "tenant-1",
  publicId: "acme",
  name: "Acme",
  status: "active" as const,
  planId: "plan-starter",
  defaultLocale: "pt-BR",
  deletedAt: null
};

const jsonResponse = (status: number, data: unknown) =>
  new Response(JSON.stringify({ data, meta: { correlationId: "corr-1" } }), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("buildWidgetSnippet", () => {
  it("builds a production embed snippet for a tenant", () => {
    expect(buildWidgetSnippet("acme")).toBe(
      '<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=acme" data-agent="acme" async></script>',
    );
  });

  it("escapes attribute characters in the embed snippet", () => {
    expect(buildWidgetSnippet('acme" onload="alert(1)')).toContain("&quot;");
  });
});

describe("API helpers", () => {
  it("logs in, refreshes, lists tenants and creates tenants", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, session))
      .mockResolvedValueOnce(jsonResponse(200, session))
      .mockResolvedValueOnce(jsonResponse(200, [tenant]))
      .mockResolvedValueOnce(jsonResponse(200, tenant))
      .mockResolvedValueOnce(jsonResponse(200, tenant))
      .mockResolvedValueOnce(jsonResponse(200, tenant));

    await expect(loginAdmin({ email: "admin@acme.test", password: "senha-super-secreta" })).resolves.toEqual(
      session,
    );
    await expect(refreshAdmin("refresh-token-1")).resolves.toEqual(session);
    await expect(listTenants("access-token-1")).resolves.toEqual([tenant]);
    await expect(
      createTenant("access-token-1", {
        publicId: "acme",
        name: "Acme",
        planSlug: "starter",
        defaultLocale: "pt-BR"
      }),
    ).resolves.toEqual(tenant);
    await expect(
      updateTenant("access-token-1", "tenant-1", {
        publicId: "acme-2",
        name: "Acme 2",
        defaultLocale: "en-US",
        status: "inactive"
      }),
    ).resolves.toEqual(tenant);
    await expect(deleteTenant("access-token-1", "tenant-1")).resolves.toEqual(tenant);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/v1/admin/tenants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1"
        })
      }),
    );
  });
});
