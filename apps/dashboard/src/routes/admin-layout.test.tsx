import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../lib/auth-context.js";
import { AdminLayout } from "./admin-layout.js";

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<div>Home content</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("AdminLayout", () => {
  beforeEach(() => {
    localStorage.setItem("faqchatbot_admin_access_token", "token-1");
    localStorage.setItem(
      "faqchatbot_admin_user",
      JSON.stringify({ id: "u1", email: "admin@acme.com", tenantId: "t1" }),
    );
  });

  it("renders navigation, the signed-in user and nested route content", () => {
    renderLayout();

    expect(screen.getByText("Home content")).toBeTruthy();
    expect(screen.getByText("admin@acme.com")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
  });

  it("logs out when the sign-out button is clicked", () => {
    renderLayout();

    screen.getByRole("button", { name: "Sair" }).click();

    expect(localStorage.getItem("faqchatbot_admin_access_token")).toBeNull();
  });
});
