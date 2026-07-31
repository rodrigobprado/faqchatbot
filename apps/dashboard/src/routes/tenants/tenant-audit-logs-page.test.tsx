import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantAuditLogsPage } from "./tenant-audit-logs-page.js";

const setSession = () => {
  localStorage.setItem("faqchatbot_admin_access_token", "token-1");
  localStorage.setItem(
    "faqchatbot_admin_user",
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1/audit-logs"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants/:id/audit-logs" element={<TenantAuditLogsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantAuditLogsPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the tenant's audit logs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "log1",
                action: "auth.login",
                targetType: "user",
                targetId: "u1",
                createdAt: "2026-01-01T00:00:00.000Z"
              }
            ]
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("auth.login")).toBeTruthy());
    expect(screen.getByText("user")).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
