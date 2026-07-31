import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantsListPage } from "./tenants-list-page.js";

const setSession = () => {
  localStorage.setItem("faqchatbot_admin_access_token", "token-1");
  localStorage.setItem(
    "faqchatbot_admin_user",
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants" element={<TenantsListPage />} />
          <Route path="/tenants/:id" element={<div>Tenant detail</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantsListPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists tenants fetched from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "1",
                publicId: "acme",
                name: "Acme Inc",
                status: "active",
                planId: "p1",
                defaultLocale: "pt-BR",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z"
              }
            ]
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("Acme Inc")).toBeTruthy());
    expect(screen.getByText("acme")).toBeTruthy();
  });

  it("creates a tenant and navigates to its detail page", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              data: {
                id: "2",
                publicId: "globex",
                name: "Globex",
                status: "active",
                planId: "22222222-2222-4222-8222-222222222222",
                defaultLocale: "pt-BR",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z"
              }
            })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo cliente" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Novo cliente" }));
    fireEvent.change(screen.getByLabelText("Identificador publico"), { target: { value: "globex" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Globex" } });
    fireEvent.change(screen.getByLabelText("ID do plano"), {
      target: { value: "22222222-2222-4222-8222-222222222222" }
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar cliente" }));
    });

    await waitFor(() => expect(screen.getByText("Tenant detail")).toBeTruthy());
  });

  it("shows a validation error when the plan id is not a UUID", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo cliente" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Novo cliente" }));
    fireEvent.change(screen.getByLabelText("Identificador publico"), { target: { value: "globex" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Globex" } });
    fireEvent.change(screen.getByLabelText("ID do plano"), { target: { value: "not-a-uuid" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar cliente" }));
    });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "POST" }));
  });
});
