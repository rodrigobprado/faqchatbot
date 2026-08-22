import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../lib/auth-context.js";
import { SystemLogsPage } from "./system-logs-page.js";

const setSession = () => {
  localStorage.setItem(ADMIN_STORAGE_KEYS.access, "token-1");
  localStorage.setItem(
    ADMIN_STORAGE_KEYS.user,
    JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/logs"]}>
      <AuthProvider>
        <SystemLogsPage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("SystemLogsPage", () => {
  beforeEach(() => {
    setSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("lists system logs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "log1",
              tenantId: null,
              level: "error",
              message: "agent routing failed",
              createdAt: "2026-01-01T00:00:00.000Z"
            }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    await waitFor(() => expect(screen.getByText("agent routing failed")).toBeTruthy());
    expect(screen.getByRole("cell", { name: "error" })).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/v1/admin/logs");
  });

  it("filters by level when the select changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Nivel"), { target: { value: "warn" } });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("level=warn"))).toBe(true),
    );
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
