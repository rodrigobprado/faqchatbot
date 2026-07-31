import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth-context.js";
import { TenantAnalyticsPage } from "./tenant-analytics-page.js";

const setSession = () => {
  localStorage.setItem("faqchatbot_admin_access_token", "token-1");
  localStorage.setItem(
    "faqchatbot_admin_user",
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tenants/1/analytics"]}>
      <AuthProvider>
        <Routes>
          <Route path="/tenants/:id/analytics" element={<TenantAnalyticsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("TenantAnalyticsPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows totals by event type and averaged metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              period: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
              totalsByEventType: [{ eventType: "WidgetSessionStarted", count: 12 }],
              averageResponseTimeMs: 842,
              averageConversationDurationMs: 120000
            }
          })
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("WidgetSessionStarted")).toBeTruthy());
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("842 ms")).toBeTruthy();
  });

  it("refetches with the chosen period", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            period: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
            totalsByEventType: [],
            averageResponseTimeMs: null,
            averageConversationDurationMs: null
          }
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url] = fetchMock.mock.calls[1] as [string];
    expect(String(url)).toContain("from=2026-02-01");
  });
});
