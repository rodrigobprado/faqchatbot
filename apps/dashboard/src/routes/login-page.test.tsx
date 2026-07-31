import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../lib/auth-context.js";
import { LoginPage } from "./login-page.js";

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a validation error for an invalid email without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/e-mail/i);
  });

  it("logs in and redirects on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            accessToken: "a1",
            refreshToken: "r1",
            expiresInSeconds: 900,
            user: { id: "u1", email: "admin@acme.com", tenantId: "t1" }
          }
        })
    });
    vi.stubGlobal("fetch", fetchMock);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@acme.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });

    expect(screen.getByText("Home page")).toBeTruthy();
  });

  it("shows the server error message on failed login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: { statusCode: 401, message: "Invalid credentials", correlationId: "c1" } })
    });
    vi.stubGlobal("fetch", fetchMock);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@acme.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });

    expect(screen.getByRole("alert").textContent).toContain("Invalid credentials");
  });
});
