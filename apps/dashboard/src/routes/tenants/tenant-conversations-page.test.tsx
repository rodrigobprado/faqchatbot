import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantConversationsPage } from "./tenant-conversations-page.js";

const setSession = () => {
  localStorage.setItem(ADMIN_STORAGE_KEYS.access, "token-1");
  localStorage.setItem(
    ADMIN_STORAGE_KEYS.user,
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1/conversations"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants/:id/conversations" element={<TenantConversationsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantConversationsPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the tenant's conversations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "c1",
                tenantId: "1",
                sessionId: "s1",
                status: "open",
                startedAt: "2026-01-01T00:00:00.000Z",
                endedAt: null
              }
            ]
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("c1")).toBeTruthy());
    expect(screen.getByText("open")).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
