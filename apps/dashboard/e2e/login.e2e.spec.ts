import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const loginSuccessBody = {
  data: {
    accessToken: "e2e-access-token",
    refreshToken: "e2e-refresh-token",
    expiresInSeconds: 3600,
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@faqchatbot.local",
      tenantId: "22222222-2222-2222-2222-222222222222"
    }
  }
};

const mockLogin = (page: Page, succeed = true) => {
  void page.route("**/v1/auth/login", (route) => {
    if (!succeed) {
      void route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { statusCode: 401, message: "Credenciais invalidas", correlationId: "e2e" } })
      });
      return;
    }

    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(loginSuccessBody)
    });
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
});

test("renders the login form", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "faqchatbot" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("rejects client-side invalid input before calling the API", async ({ page }) => {
  let loginCalled = false;
  page.on("request", (request) => {
    if (request.url().includes("/v1/auth/login")) {
      loginCalled = true;
    }
  });

  await page.getByLabel("E-mail").fill("nao-e-email");
  await page.getByLabel("Senha").fill("curta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("validos");
  expect(loginCalled).toBe(false);
});

test("shows an error when credentials are rejected", async ({ page }) => {
  mockLogin(page, false);

  await page.getByLabel("E-mail").fill("admin@faqchatbot.local");
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("Credenciais invalidas");
});

test("logs in, stores tokens and redirects to the admin area", async ({ page }) => {
  mockLogin(page, true);

  await page.getByLabel("E-mail").fill("admin@faqchatbot.local");
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).not.toHaveURL(/\/login/);

  const stored = await page.evaluate(() => ({
    access: localStorage.getItem("faqchatbot_admin_access_token"),
    refresh: localStorage.getItem("faqchatbot_admin_refresh_token"),
    user: localStorage.getItem("faqchatbot_admin_user")
  }));

  expect(stored.access).toBe("e2e-access-token");
  expect(stored.refresh).toBe("e2e-refresh-token");
  expect(stored.user ? JSON.parse(stored.user).email : null).toBe("admin@faqchatbot.local");

  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});

test("login page passes axe accessibility scan", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
