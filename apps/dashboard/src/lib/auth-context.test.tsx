import { ADMIN_STORAGE_KEYS } from "@faqchatbot/testing";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context.js";

const Probe = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{isAuthenticated ? "in" : "out"}</span>
      <span data-testid="email">{user?.email ?? ""}</span>
      <button onClick={() => void login("admin@acme.com", "password123")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts unauthenticated and logs in against POST /v1/auth/login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            accessToken: "access-1",
            refreshToken: "refresh-1",
            expiresInSeconds: 900,
            user: { id: "u1", email: "admin@acme.com", tenantId: "t1" }
          }
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("out");

    await act(async () => {
      screen.getByText("login").click();
    });

    expect(screen.getByTestId("status").textContent).toBe("in");
    expect(screen.getByTestId("email").textContent).toBe("admin@acme.com");
    expect(localStorage.getItem(ADMIN_STORAGE_KEYS.access)).toBe("access-1");
  });

  it("restores the session from localStorage on mount", () => {
    localStorage.setItem(ADMIN_STORAGE_KEYS.access, "access-2");
    localStorage.setItem(
      ADMIN_STORAGE_KEYS.user,
      JSON.stringify({ id: "u2", email: "b@acme.com", tenantId: "t2" }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("status").textContent).toBe("in");
    expect(screen.getByTestId("email").textContent).toBe("b@acme.com");
  });

  it("clears the session on logout", async () => {
    localStorage.setItem(ADMIN_STORAGE_KEYS.access, "access-3");
    localStorage.setItem(
      ADMIN_STORAGE_KEYS.user,
      JSON.stringify({ id: "u3", email: "c@acme.com", tenantId: "t3" }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      screen.getByText("logout").click();
    });

    expect(screen.getByTestId("status").textContent).toBe("out");
    expect(localStorage.getItem(ADMIN_STORAGE_KEYS.access)).toBeNull();
  });

  it("throws when useAuth is used outside the provider", () => {
    const Broken = () => {
      useAuth();
      return null;
    };

    expect(() => render(<Broken />)).toThrow();
  });
});
