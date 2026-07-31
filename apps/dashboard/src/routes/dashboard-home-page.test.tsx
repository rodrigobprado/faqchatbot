import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../lib/auth-context.js";
import { DashboardHomePage } from "./dashboard-home-page.js";

describe("DashboardHomePage", () => {
  beforeEach(() => {
    localStorage.setItem("faqchatbot_admin_access_token", "token-1");
    localStorage.setItem(
      "faqchatbot_admin_user",
      JSON.stringify({ id: "u1", email: "a@b.com", tenantId: "t1" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows tenant counts fetched from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            { id: "1", status: "active" },
            { id: "2", status: "active" },
            { id: "3", status: "suspended" }
          ]
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <DashboardHomePage />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(
      <AuthProvider>
        <DashboardHomePage />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
