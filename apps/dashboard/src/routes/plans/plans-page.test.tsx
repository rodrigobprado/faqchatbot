import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { PlansPage } from "./plans-page.js";

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

const renderPage = () =>
  render(
    <AuthProvider>
      <PlansPage />
    </AuthProvider>,
  );

describe("PlansPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists plans fetched from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ id: "p1", slug: "starter", name: "Starter", priceCents: 0, limits: { messagesPerMinute: 20 } }]
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("Starter")).toBeTruthy());
    expect(screen.getByText("starter")).toBeTruthy();
  });

  it("creates a new plan", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = routeFor(url);
      const method = init?.method ?? "GET";
      if (method === "POST" && path === "/v1/admin/plans") {
        return jsonResponse({ id: "p2", slug: "growth", name: "Growth", priceCents: 9900, limits: {} });
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo plano" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Novo plano" }));
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "growth" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Growth" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    });

    await waitFor(() => expect(screen.getByText("Growth")).toBeTruthy());
  });

  it("shows a validation error when creating a plan without slug or name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo plano" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Novo plano" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    });

    expect(screen.getByRole("alert").textContent).toContain("Informe slug e nome");
  });

  it("shows an error message when loading plans fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });

  it("updates a plan's messages-per-minute limit on blur", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = routeFor(url);
      const method = init?.method ?? "GET";
      if (method === "GET" && path === "/v1/admin/plans") {
        return jsonResponse([{ id: "p1", slug: "starter", name: "Starter", priceCents: 0, limits: {} }]);
      }
      if (method === "PATCH" && path === "/v1/admin/plans/p1") {
        return jsonResponse({ id: "p1", slug: "starter", name: "Starter", priceCents: 0, limits: { messagesPerMinute: 40 } });
      }
      throw new Error(`Unhandled request: ${method} ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    await waitFor(() => expect(screen.getByText("Starter")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Mensagens por minuto para Starter"), { target: { value: "40" } });
    await act(async () => {
      fireEvent.blur(screen.getByLabelText("Mensagens por minuto para Starter"));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/plans/p1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
