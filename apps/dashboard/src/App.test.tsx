import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects an unauthenticated visitor to the login page", () => {
    render(<App />);

    expect(screen.getByText("Acesso administrativo")).toBeTruthy();
  });

  it("shows the dashboard home for an authenticated admin", async () => {
    localStorage.setItem("faqchatbot_admin_access_token", "token-1");
    localStorage.setItem(
      "faqchatbot_admin_user",
      JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText("Embeddable AI Platform")).toBeTruthy());
  });
});
