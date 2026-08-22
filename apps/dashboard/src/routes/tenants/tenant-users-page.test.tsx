import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantUsersPage } from "./tenant-users-page.js";

const setSession = () => {
  localStorage.setItem(ADMIN_STORAGE_KEYS.access, "token-1");
  localStorage.setItem(
    ADMIN_STORAGE_KEYS.user,
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const routeFor = (url: string): string => new URL(url, "http://localhost").pathname;
const jsonResponse = (data: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data }) });

const dispatchFetch = (overrides: Record<string, unknown> = {}) =>
  vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = routeFor(url);
    const method = init?.method ?? "GET";

    if (method === "GET" && path === "/v1/admin/tenants/1/users") {
      return jsonResponse(
        overrides.users ?? [{ id: "u2", email: "agent@acme.com", status: "active", roleSlugs: ["support"] }],
      );
    }
    if (method === "GET" && path === "/v1/admin/tenants/1/roles") {
      return jsonResponse(overrides.roles ?? [{ id: "r1", slug: "support", name: "Support", permissionSlugs: [] }]);
    }
    if (method === "GET" && path === "/v1/admin/permissions") {
      return jsonResponse(overrides.permissions ?? [{ id: "p1", slug: "tenants:read", description: null }]);
    }
    if (method === "POST" && path === "/v1/admin/tenants/1/users") {
      return jsonResponse({ id: "u3", email: "new@acme.com", status: "active" });
    }
    if (method === "POST" && path === "/v1/admin/tenants/1/roles") {
      return jsonResponse({ id: "r2", slug: "billing", name: "Billing", permissionSlugs: [] });
    }

    throw new Error(`Unhandled request: ${method} ${path}`);
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1/users"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants/:id/users" element={<TenantUsersPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantUsersPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists users with their roles and lists roles with their permissions", async () => {
    vi.stubGlobal("fetch", dispatchFetch());

    renderPage();

    await waitFor(() => expect(screen.getByText("agent@acme.com")).toBeTruthy());
    expect(screen.getAllByText("support").length).toBeGreaterThan(0);
  });

  it("creates a new user with a selected role", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo usuario" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Novo usuario" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "new@acme.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByLabelText("support"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar usuario" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/users"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@acme.com", password: "password123", roleSlugs: ["support"] })
      }),
    );
  });

  it("creates a new role with a selected permission", async () => {
    const fetchMock = dispatchFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo papel" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Novo papel" }));
    fireEvent.change(screen.getByLabelText("Slug do papel"), { target: { value: "billing" } });
    fireEvent.change(screen.getByLabelText("Nome do papel"), { target: { value: "Billing" } });
    fireEvent.click(screen.getByLabelText("tenants:read"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar papel" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/tenants/1/roles"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slug: "billing", name: "Billing", permissionSlugs: ["tenants:read"] })
      }),
    );
  });
});
