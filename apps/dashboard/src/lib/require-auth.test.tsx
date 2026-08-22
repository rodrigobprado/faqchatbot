import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth-context.js";
import { RequireAuth } from "./require-auth.js";

const renderWithRouter = (initialToken: string | null) => {
  if (initialToken) {
    localStorage.setItem(ADMIN_STORAGE_KEYS.access, initialToken);
    localStorage.setItem(
      ADMIN_STORAGE_KEYS.user,
      JSON.stringify({ id: "u1", email: "a@b.com", tenantId: "t1" }),
    );
  }

  return render(
    <MemoryRouter initialEntries={["/tenants"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/tenants"
            element={
              <RequireAuth>
                <div>Tenants page</div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe("RequireAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the protected content when authenticated", () => {
    renderWithRouter("token-1");

    expect(screen.getByText("Tenants page")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    renderWithRouter(null);

    expect(screen.getByText("Login page")).toBeTruthy();
  });
});
