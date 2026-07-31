import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantDetailPage } from "./tenant-detail-page.js";

const setSession = () => {
  localStorage.setItem("faqchatbot_admin_access_token", "token-1");
  localStorage.setItem(
    "faqchatbot_admin_user",
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const tenant = {
  id: "1",
  publicId: "acme",
  name: "Acme Inc",
  status: "active",
  planId: "11111111-1111-4111-8111-111111111111",
  defaultLocale: "pt-BR",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const domains = [{ id: "d1", tenantId: "1", domain: "acme.example.com", isVerified: true }];
const config = { theme: "auto", primaryColor: "#2563eb", initialMessage: "", placeholder: "" };
const agentConfig = { provider: "n8n", timeoutMs: 15000, retryPolicy: {} };
const rateLimits = {
  overrides: [],
  effective: [
    { scope: "ip", limit: 60, windowSeconds: 60 },
    { scope: "tenant", limit: 600, windowSeconds: 60 },
    { scope: "api_key", limit: 300, windowSeconds: 60 },
    { scope: "visitor", limit: 20, windowSeconds: 60 },
    { scope: "conversation", limit: 20, windowSeconds: 60 }
  ]
};

const routeFor = (url: string): string => new URL(url, "http://localhost").pathname;

const jsonResponse = (data: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data }) });

const dispatchFetch = (overrides: Record<string, unknown> = {}) =>
  vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = routeFor(url);
    const method = init?.method ?? "GET";

    if (method === "GET" && path === "/v1/admin/tenants/1") {
      return jsonResponse(overrides.tenant ?? tenant);
    }
    if (method === "GET" && path === "/v1/admin/tenants/1/domains") {
      return jsonResponse(overrides.domains ?? domains);
    }
    if (method === "GET" && path === "/v1/admin/tenants/1/config") {
      return jsonResponse(overrides.config ?? config);
    }
    if (method === "GET" && path === "/v1/admin/tenants/1/agent-config") {
      return jsonResponse(overrides.agentConfig ?? agentConfig);
    }
    if (method === "GET" && path === "/v1/admin/tenants/1/rate-limits") {
      return jsonResponse(overrides.rateLimits ?? rateLimits);
    }
    if (method === "PATCH" && path === "/v1/admin/tenants/1") {
      return jsonResponse({ ...tenant, name: "Acme Renamed" });
    }
    if (method === "DELETE" && path === "/v1/admin/tenants/1") {
      return Promise.resolve({ ok: true, status: 204, json: vi.fn() });
    }
    if (method === "POST" && path === "/v1/admin/tenants/1/domains") {
      return jsonResponse({ id: "d2", tenantId: "1", domain: "new.example.com", isVerified: false });
    }
    if (method === "DELETE" && path === "/v1/admin/tenants/1/domains/d1") {
      return Promise.resolve({ ok: true, status: 204, json: vi.fn() });
    }
    if (method === "PUT" && path === "/v1/admin/tenants/1/config") {
      return jsonResponse(config);
    }
    if (method === "PUT" && path === "/v1/admin/tenants/1/agent-config") {
      return jsonResponse(agentConfig);
    }
    if (method === "PUT" && path === "/v1/admin/tenants/1/rate-limits") {
      return jsonResponse({ tenantId: "1", scope: "tenant", limit: 5, windowSeconds: 30 });
    }

    throw new Error(`Unhandled request: ${method} ${path}`);
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants" element={<div>Tenants list</div>} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantDetailPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and shows the tenant's data, domains and effective rate limits", async () => {
    vi.stubGlobal("fetch", dispatchFetch());

    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());
    expect(screen.getByText("acme.example.com")).toBeTruthy();
    expect(screen.getAllByDisplayValue("60").length).toBeGreaterThan(0);
  });

  it("shows the webhook URL but never pre-fills the webhook secret field", async () => {
    vi.stubGlobal(
      "fetch",
      dispatchFetch({
        agentConfig: {
          provider: "n8n",
          webhookUrl: "https://n8n.internal/webhook/acme",
          timeoutMs: 15000,
          retryPolicy: {}
        }
      }),
    );

    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    expect(screen.getByDisplayValue("https://n8n.internal/webhook/acme")).toBeTruthy();
    const secretInput = screen.getByLabelText("Segredo do webhook") as HTMLInputElement;
    expect(secretInput.value).toBe("");
  });

  it("saves basic tenant data", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Acme Renamed" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("adds and removes an authorized domain", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByText("acme.example.com")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Novo dominio"), { target: { value: "new.example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Adicionar dominio" }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/domains"),
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remover acme.example.com" }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/domains/d1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("saves the appearance config", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Cor primaria"), { target: { value: "#000000" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar aparencia" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/config"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("saves the agent config, including a freshly typed webhook secret", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Segredo do webhook"), { target: { value: "top-secret" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar agente" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/agent-config"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("top-secret")
      }),
    );
  });

  it("updates a rate limit row and saves it", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Limite para tenant"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Janela para tenant"), { target: { value: "30" } });

    const rows = screen.getAllByRole("button", { name: "Salvar" });
    const tenantRowSaveButton = rows[1];
    if (!tenantRowSaveButton) {
      throw new Error("expected a second rate-limit row");
    }
    await act(async () => {
      fireEvent.click(tenantRowSaveButton);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/rate-limits"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("deletes the tenant and navigates back to the list", async () => {
    vi.stubGlobal("fetch", dispatchFetch());
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Acme Inc")).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remover cliente" }));
    });

    await waitFor(() => expect(screen.getByText("Tenants list")).toBeTruthy());
  });
});
