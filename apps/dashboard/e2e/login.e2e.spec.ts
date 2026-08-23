import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "faqchatbot.dashboard.session.v1";

const adminSession = {
  accessToken: "e2e-access-token",
  refreshToken: "e2e-refresh-token",
  expiresInSeconds: 3600,
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "22222222-2222-2222-2222-222222222222",
    email: "admin@faqchatbot.local",
    roles: ["admin"]
  }
};

const mockPlatform = (page: Page) => {
  void page.route("**/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          status: "ok",
          service: "api",
          timestamp: new Date().toISOString(),
          checks: { database: "ok" }
        }
      })
    }),
  );

  void page.route("**/v1/admin/tenants/plans", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }),
  );

  void page.route("**/v1/admin/tenants", (route) => {
    if (route.request().method() === "GET") {
      void route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
      return;
    }
    void route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
  });

  void page.route("**/v1/admin/users*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }),
  );
};

const mockLogin = (page: Page, succeed = true) => {
  void page.route("**/v1/auth/login", (route) => {
    if (!succeed) {
      void route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { statusCode: 401, message: "Credenciais invalidas", code: "INVALID_CREDENTIALS" }
        })
      });
      return;
    }

    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: adminSession })
    });
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the administrative login form", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Acesso administrativo" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
});

test("rejects invalid credentials and shows the API error banner", async ({ page }) => {
  mockLogin(page, false);

  await page.getByLabel("E-mail").fill("admin@faqchatbot.local");
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  const banner = page.locator(".banner.error");
  await expect(banner).toContainText("Credenciais invalidas");

  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test("logs in, stores the session and greets the admin", async ({ page }) => {
  let loginCalled = false;
  page.on("request", (request) => {
    if (request.url().includes("/v1/auth/login") && request.method() === "POST") {
      loginCalled = true;
    }
  });
  mockLogin(page, true);
  mockPlatform(page);

  await page.getByLabel("E-mail").fill("admin@faqchatbot.local");
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.locator(".banner.success")).toContainText(`Bem-vindo, ${adminSession.user.email}`);
  expect(loginCalled).toBe(true);

  const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(stored).not.toBeNull();
  const parsedSession = stored ? (JSON.parse(stored) as { user?: { email?: string } }) : null;
  expect(parsedSession?.user?.email).toBe(adminSession.user.email);

  await expect(page.locator('aside[aria-label="Navegacao principal"]')).toBeVisible();
});

test("restores the session from localStorage after a reload", async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(adminSession) },
  );

  await page.reload();

  await expect(page.locator('aside[aria-label="Navegacao principal"]')).toBeVisible();
  await expect(page.getByLabel("Senha")).toHaveCount(0);
});

test("login view passes axe accessibility scan", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
