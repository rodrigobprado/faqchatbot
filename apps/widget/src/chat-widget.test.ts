import type { WidgetSessionStartResponse } from "@faqchatbot/contracts";
import { buildWidgetSessionResponse } from "@faqchatbot/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./session-client.js", () => ({ startWidgetSession: vi.fn() }));
vi.mock("./chat-client.js", () => ({ sendChatMessage: vi.fn(), fetchChatHistory: vi.fn() }));
vi.mock("./chat-stream-client.js", () => ({ openChatStream: vi.fn() }));

import "./chat-widget.js";
import type { FaqChatWidgetElement } from "./chat-widget.js";
import { fetchChatHistory, sendChatMessage } from "./chat-client.js";
import { openChatStream } from "./chat-stream-client.js";
import { startWidgetSession } from "./session-client.js";
import { loadStoredSessionIds, saveStoredSessionIds } from "./session-storage.js";

const startWidgetSessionMock = vi.mocked(startWidgetSession);
const sendChatMessageMock = vi.mocked(sendChatMessage);
const fetchChatHistoryMock = vi.mocked(fetchChatHistory);
const openChatStreamMock = vi.mocked(openChatStream);

const buildResponse = (overrides: Partial<WidgetSessionStartResponse> = {}): WidgetSessionStartResponse =>
  buildWidgetSessionResponse({
    tenant: { id: "44444444-4444-4444-4444-444444444444", publicId: "acme", name: "Acme Inc" },
    config: {
      theme: "dark",
      primaryColor: "#ff0000",
      initialMessage: "Bem-vindo!",
      placeholder: "Fale com a gente"
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

  it("emits messages when send is called without an active session", () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    const messages: string[] = [];
    element.addEventListener("chat-widget:message", (event) => {
      messages.push((event as CustomEvent<{ message: string }>).detail.message);
    });

    element.send(" Ola ");

    expect(messages).toEqual(["Ola"]);
    expect(sendChatMessageMock).not.toHaveBeenCalled();
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
});

describe("FaqChatWidgetElement session bootstrap", () => {
  const createElement = async () => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    document.body.append(element);
    await element.updateComplete;
    return element;
  };

  const connectElement = async (overrides: Partial<WidgetSessionStartResponse> = {}) => {
    const element = await createElement();
    element.agentId = "acme";
    element.apiUrl = "https://api.example.com";
    startWidgetSessionMock.mockResolvedValue(buildResponse(overrides));
    fetchChatHistoryMock.mockResolvedValue([]);
    openChatStreamMock.mockResolvedValue(undefined);

    await element.connect();
    await element.updateComplete;
    return element;
  };

  beforeEach(() => {
    window.localStorage.clear();
    startWidgetSessionMock.mockReset();
    fetchChatHistoryMock.mockReset();
    openChatStreamMock.mockReset();
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
    const element = await connectElement();
    const stored = loadStoredSessionIds("acme");

    expect(startWidgetSessionMock).toHaveBeenCalledWith(
      "https://api.example.com",
      expect.objectContaining({ agentId: "acme" }),
    );
    expect(element.style.getPropertyValue("--faq-primary-color")).toBe("#ff0000");
    expect(element.style.colorScheme).toBe("dark");
    expect(stored).toEqual({
      visitorId: "11111111-1111-1111-1111-111111111111",
      sessionId: "22222222-2222-2222-2222-222222222222",
      conversationId: "33333333-3333-3333-3333-333333333333"
    });

    element.remove();
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
    fetchChatHistoryMock.mockResolvedValue([]);
    openChatStreamMock.mockResolvedValue(undefined);

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

describe("FaqChatWidgetElement chat flow", () => {
  const connectElement = async (history: Parameters<typeof fetchChatHistoryMock.mockResolvedValue>[0] = []) => {
    const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
    document.body.append(element);
    element.agentId = "acme";
    element.apiUrl = "https://api.example.com";
    startWidgetSessionMock.mockResolvedValue(buildResponse());
    fetchChatHistoryMock.mockResolvedValue(history);
    openChatStreamMock.mockImplementation(async ({ onEvent }) => {
      onEvent({ type: "typing" });
      onEvent({ type: "token", token: "Ola" });
      onEvent({ type: "token", token: "visitante!" });
      onEvent({
        type: "message",
        message: {
          id: "aaaaaaa1-1111-1111-1111-111111111111",
          conversationId: "33333333-3333-3333-3333-333333333333",
          role: "assistant",
          metadata: {},
          content: { type: "text", text: "Ola visitante!" }
        }
      });
    });

    await element.connect();
    await element.updateComplete;
    element.open();
    await element.updateComplete;
    return element;
  };

  beforeEach(() => {
    window.localStorage.clear();
    startWidgetSessionMock.mockReset();
    fetchChatHistoryMock.mockReset();
    openChatStreamMock.mockReset();
    sendChatMessageMock.mockReset();
  });

  afterEach(() => {
    document.body.querySelectorAll("faq-chat-widget").forEach((el) => el.remove());
  });

  it("delivers submitted messages to the chat API and renders the user bubble", async () => {
    const element = await connectElement();
    sendChatMessageMock.mockResolvedValue({
      id: "aaaaaaa2-1111-1111-1111-111111111111",
      conversationId: "33333333-3333-3333-3333-333333333333",
      role: "user",
      metadata: {},
      content: { type: "text", text: "Tenho uma duvida" }
    });

    const input = element.shadowRoot?.querySelector("input");
    const form = element.shadowRoot?.querySelector("form");
    input!.value = "Tenho uma duvida";
    input!.dispatchEvent(new InputEvent("input", { bubbles: true }));
    form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(sendChatMessageMock).toHaveBeenCalled());
    await element.updateComplete;

    expect(sendChatMessageMock).toHaveBeenCalledWith(
      "https://api.example.com",
      "token",
      "33333333-3333-3333-3333-333333333333",
      "Tenho uma duvida"
    );

    const rendered = [...element.shadowRoot!.querySelectorAll(".msg")].map((node) => node.textContent);
    expect(rendered.some((text) => text === "Tenho uma duvida")).toBe(true);

    element.remove();
  });

  it("renders streaming tokens and the final assistant message", async () => {
    const element = await connectElement();

    await element.updateComplete;

    const rendered = [...element.shadowRoot!.querySelectorAll(".msg")].map((node) => node.textContent);
    expect(rendered.filter((text) => text === "Ola visitante!")).toHaveLength(1);
    expect(element.shadowRoot?.querySelector(".typing")).toBeNull();

    element.remove();
  });

  it("loads history after connecting", async () => {
    const element = await connectElement([
      {
        id: "aaaaaaa3-1111-1111-1111-111111111111",
        conversationId: "33333333-3333-3333-3333-333333333333",
        role: "assistant",
        metadata: {},
        content: { type: "markdown", markdown: "**Resposta anterior**" }
      }
    ]);

    expect(fetchChatHistoryMock).toHaveBeenCalledWith(
      "https://api.example.com",
      "token",
      "33333333-3333-3333-3333-333333333333",
    );
    const rendered = [...element.shadowRoot!.querySelectorAll(".msg")].map((node) => node.textContent);
    expect(rendered).toContain("**Resposta anterior**");

    element.remove();
  });

  it("shows an error entry and emits chat-widget:error when sending fails", async () => {
    const element = await connectElement();
    sendChatMessageMock.mockRejectedValue(new Error("network down"));
    const errors: string[] = [];
    element.addEventListener("chat-widget:error", (event) => {
      errors.push((event as CustomEvent<{ message: string }>).detail.message);
    });

    await element.send("Falhou");

    await vi.waitFor(() => expect(errors).toEqual(["network down"]));
    await element.updateComplete;

    const rendered = [...element.shadowRoot!.querySelectorAll(".msg--system")].map((node) => node.textContent);
    expect(rendered).toHaveLength(1);

    element.remove();
  });

  it("aborts the stream when the widget is removed", async () => {
    const element = await connectElement();
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    element.remove();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
