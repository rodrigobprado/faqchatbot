import AxeBuilder from "@axe-core/playwright";
import { buildWidgetSessionResponse, WIDGET_SESSION_IDS } from "@faqchatbot/testing";
import { expect, test, type Page } from "@playwright/test";

const CONVERSATION_ID = WIDGET_SESSION_IDS.conversationId;

const sessionResponse = {
  data: buildWidgetSessionResponse()
};

const streamBody = [
  'data: {"type":"typing"}',
  "",
  'data: {"type":"token","token":"Atendimento"}',
  "",
  'data: {"type":"token","token":"iniciado"}',
  "",
  `data: {"type":"message","message":{"id":"aaaaaaa1-1111-1111-1111-111111111111","conversationId":"${CONVERSATION_ID}","role":"assistant","metadata":{},"content":{"type":"text","text":"Atendimento iniciado"}}}`,
  ""
].join("\n\n");

const mockApi = async (page: Page) => {
  await page.route("**/v1/widget/session/start", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionResponse) }),
  );

  await page.route("**/v1/chat/history/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { messages: [] } }) }),
  );

  await page.route("**/v1/chat/stream/*", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: streamBody }),
  );

  await page.route("**/v1/chat/messages", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "aaaaaaa2-1111-1111-1111-111111111111",
          conversationId: CONVERSATION_ID,
          role: "user",
          metadata: {},
          content: { type: "text", text: "Tenho uma duvida" }
        }
      })
    }),
  );
};

const openPanel = async (page: Page) => {
  const widget = page.locator("faq-chat-widget");
  await expect(widget).toBeAttached();
  await expect(widget.locator(".launcher")).toBeVisible();
  await page.evaluate(() => window.ChatWidget?.open());
  const panel = widget.locator(".panel");
  await expect(panel).toBeVisible();
  return panel;
};

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("opens and closes the panel from the public API and the launcher", async ({ page }) => {
  await page.goto("/e2e-fixture.html");
  const panel = await openPanel(page);

  await page.evaluate(() => window.ChatWidget?.close());
  await expect(panel).toBeHidden();

  await page.locator("faq-chat-widget .launcher").click();
  await expect(panel).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("sends a message and renders the streamed assistant reply", async ({ page }) => {
  await page.goto("/e2e-fixture.html");
  const panel = await openPanel(page);

  let messagePosted = false;
  page.on("request", (request) => {
    if (request.url().includes("/v1/chat/messages") && request.method() === "POST") {
      messagePosted = true;
    }
  });

  await panel.locator("input").fill("Tenho uma duvida");
  await panel.locator(".send").click();

  const messages = panel.locator(".msg");
  await expect(messages.filter({ hasText: "Tenho uma duvida" })).toHaveCount(1);
  await expect(messages.filter({ hasText: "Atendimento iniciado" })).toHaveCount(1);
  expect(messagePosted).toBe(true);
});

test("persists session identifiers in localStorage", async ({ page }) => {
  await page.goto("/e2e-fixture.html");
  await openPanel(page);

  const stored = await page.evaluate(() => localStorage.getItem("faqchatbot:widget-session:demo"));
  const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : null;

  expect(parsed).toMatchObject({
    visitorId: "11111111-1111-1111-1111-111111111111",
    sessionId: "22222222-2222-2222-2222-222222222222"
  });
});

test("destroy removes the widget and the public API", async ({ page }) => {
  await page.goto("/e2e-fixture.html");
  await openPanel(page);

  await page.evaluate(() => window.ChatWidget?.destroy());

  await expect(page.locator("faq-chat-widget")).toHaveCount(0);
  const apiGone = await page.evaluate(() => window.ChatWidget === undefined);
  expect(apiGone).toBe(true);
});

test("passes axe accessibility scan with the panel open", async ({ page }) => {
  await page.goto("/e2e-fixture.html");
  await openPanel(page);

  const results = await new AxeBuilder({ page }).include("faq-chat-widget").analyze();

  expect(results.violations).toEqual([]);
});
