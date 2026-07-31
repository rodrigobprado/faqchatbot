import type { WidgetSessionStartResponse } from "@faqchatbot/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./session-client.js", () => ({ startWidgetSession: vi.fn() }));

import "./chat-widget.js";
import type { FaqChatWidgetElement } from "./chat-widget.js";
import { startWidgetSession } from "./session-client.js";
import { loadStoredSessionIds, saveStoredSessionIds } from "./session-storage.js";

const startWidgetSessionMock = vi.mocked(startWidgetSession);

const buildResponse = (overrides: Partial<WidgetSessionStartResponse> = {}): WidgetSessionStartResponse => ({
  accessToken: "token",
  expiresInSeconds: 3600,
  visitorId: "11111111-1111-1111-1111-111111111111",
  sessionId: "22222222-2222-2222-2222-222222222222",
  conversationId: "33333333-3333-3333-3333-333333333333",
  tenant: { id: "44444444-4444-4444-4444-444444444444", publicId: "acme", name: "Acme Inc" },
  config: {
    locale: "pt-BR",
    theme: "dark",
    position: "bottom-right",
    primaryColor: "#ff0000",
    initialMessage: "Bem-vindo!",
    placeholder: "Fale com a gente",
    width: 380,
    height: 600
  },
  ...overrides
});

describe("FaqChatWidgetElement", () => {
  const createElement = async () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    document.body.append(element);
    await element.updateComplete;
    return element;
  };

  it("renders inside shadow DOM", async () => {
    const element = await createElement();

    expect(element.shadowRoot).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".launcher")).not.toBeNull();

    element.remove();
  });

  it("emits messages when send is called", () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    const messages: string[] = [];
    element.addEventListener("chat-widget:message", (event) => {
      messages.push((event as CustomEvent<{ message: string }>).detail.message);
    });

    element.send(" Ola ");

    expect(messages).toEqual(["Ola"]);
  });

  it("does not emit empty messages", () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    let calls = 0;
    element.addEventListener("chat-widget:message", () => {
      calls += 1;
    });

    element.send("   ");

    expect(calls).toBe(0);
  });

  it("opens, closes and toggles the panel", async () => {
    const element = await createElement();
    const events: string[] = [];
    element.addEventListener("chat-widget:open", () => events.push("open"));
    element.addEventListener("chat-widget:close", () => events.push("close"));

    element.open();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".panel")).not.toBeNull();

    element.close();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".panel")).toBeNull();

    element.toggle();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".panel")).not.toBeNull();

    element.toggle();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".panel")).toBeNull();
    expect(events).toEqual(["open", "close", "open", "close"]);

    element.remove();
  });

  it("emits identify and theme events", () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    const events: string[] = [];
    element.addEventListener("chat-widget:identify", (event) => {
      events.push((event as CustomEvent<{ email: string }>).detail.email);
    });
    element.addEventListener("chat-widget:theme", () => {
      events.push("theme");
    });

    element.identify({ email: "user@example.com" });
    element.setTheme();

    expect(events).toEqual(["user@example.com", "theme"]);
  });

  it("submits the form from the rendered panel", async () => {
    const element = await createElement();
    const messages: string[] = [];
    element.addEventListener("chat-widget:message", (event) => {
      messages.push((event as CustomEvent<{ message: string }>).detail.message);
    });

    element.open();
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector("input");
    const form = element.shadowRoot?.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    input!.value = "Mensagem pelo formulario";
    input!.dispatchEvent(new InputEvent("input", { bubbles: true }));
    form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await element.updateComplete;

    expect(messages).toEqual(["Mensagem pelo formulario"]);
    expect(element.shadowRoot?.querySelector("input")?.value).toBe("");

    element.remove();
  });
});

describe("FaqChatWidgetElement session bootstrap", () => {
  const createElement = async () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    document.body.append(element);
    await element.updateComplete;
    return element;
  };

  beforeEach(() => {
    window.localStorage.clear();
    startWidgetSessionMock.mockReset();
  });

  afterEach(() => {
    document.body.querySelectorAll("faq-chat-widget").forEach((el) => el.remove());
  });

  it("does nothing when no agentId is configured", async () => {
    const element = await createElement();

    await element.connect();

    expect(startWidgetSessionMock).not.toHaveBeenCalled();
  });

  it("starts a session, applies the tenant theme and persists identifiers", async () => {
    const element = await createElement();
    element.agentId = "acme";
    element.apiUrl = "https://api.example.com";
    startWidgetSessionMock.mockResolvedValue(buildResponse());

    const events: string[] = [];
    element.addEventListener("chat-widget:connect", () => events.push("connect"));
    element.addEventListener("chat-widget:conversation-start", () => events.push("conversation-start"));

    await element.connect();
    await element.updateComplete;

    expect(startWidgetSessionMock).toHaveBeenCalledWith(
      "https://api.example.com",
      expect.objectContaining({ agentId: "acme" }),
    );
    expect(events).toEqual(["connect", "conversation-start"]);
    expect(element.style.getPropertyValue("--faq-primary-color")).toBe("#ff0000");
    expect(element.style.colorScheme).toBe("dark");
    expect(loadStoredSessionIds("acme")).toEqual({
      visitorId: "11111111-1111-1111-1111-111111111111",
      sessionId: "22222222-2222-2222-2222-222222222222",
      conversationId: "33333333-3333-3333-3333-333333333333"
    });

    element.open();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".messages")?.textContent).toBe("Bem-vindo!");
  });

  it("reuses stored identifiers on a subsequent connect", async () => {
    saveStoredSessionIds("acme", {
      visitorId: "stored-visitor",
      sessionId: "stored-session",
      conversationId: "stored-conversation"
    });
    const element = await createElement();
    element.agentId = "acme";
    element.apiUrl = "https://api.example.com";
    startWidgetSessionMock.mockResolvedValue(buildResponse());

    await element.connect();

    expect(startWidgetSessionMock).toHaveBeenCalledWith(
      "https://api.example.com",
      expect.objectContaining({
        visitorId: "stored-visitor",
        sessionId: "stored-session",
        conversationId: "stored-conversation"
      }),
    );
  });

  it("emits an error event when the session fails to start", async () => {
    const element = await createElement();
    element.agentId = "acme";
    element.apiUrl = "https://api.example.com";
    startWidgetSessionMock.mockRejectedValue(new Error("boom"));

    const errors: string[] = [];
    element.addEventListener("chat-widget:error", (event) => {
      errors.push((event as CustomEvent<{ message: string }>).detail.message);
    });

    await element.connect();

    expect(errors).toEqual(["boom"]);
  });
});
