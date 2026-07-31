import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantSessionsPage } from "./tenant-sessions-page.js";

const setSession = () => {
  localStorage.setItem("faqchatbot_admin_access_token", "token-1");
  localStorage.setItem(
    "faqchatbot_admin_user",
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1/sessions"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants/:id/sessions" element={<TenantSessionsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantSessionsPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the tenant's visitor sessions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "s1",
                visitorId: "v1",
                startedAt: "2026-01-01T00:00:00.000Z",
                lastSeenAt: "2026-01-01T00:05:00.000Z",
                pageContext: { url: "https://acme.example.com/pricing" }
              }
            ]
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("s1")).toBeTruthy());
    expect(screen.getByText("https://acme.example.com/pricing")).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
