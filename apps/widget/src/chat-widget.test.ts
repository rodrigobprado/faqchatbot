import { afterEach, describe, expect, it, vi } from "vitest";
import "./chat-widget.js";
import type { FaqChatWidgetElement } from "./chat-widget.js";

describe("FaqChatWidgetElement", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

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

  it("focuses the message input when opened and closes on Escape", async () => {
    const element = await createElement();

    element.open();
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector<HTMLInputElement>("#faqchatbot-message");
    expect(input).not.toBeNull();
    expect(element.shadowRoot?.activeElement).toBe(input);

    element.shadowRoot?.querySelector(".panel")?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".panel")).toBeNull();
    element.remove();
  });

  it("emits identify and theme events", async () => {
    const element = await createElement();
    const events: string[] = [];
    element.addEventListener("chat-widget:identify", (event) => {
      events.push((event as CustomEvent<{ email: string }>).detail.email);
    });
    element.addEventListener("chat-widget:theme", () => {
      events.push("theme");
    });

    element.identify({ email: "user@example.com" });
    element.setTheme("dark");
    await element.updateComplete;

    expect(events).toEqual(["user@example.com", "theme"]);
    expect(element.getAttribute("data-theme")).toBe("dark");
    element.remove();
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

  it("hydrates a session and persists it in localStorage", async () => {
    const element = await createElement();
    const storedEvents: unknown[] = [];
    element.addEventListener("chat-widget:connect", (event) => {
      storedEvents.push((event as CustomEvent).detail);
    });

    element.hydrateSession({
      accessToken: "token",
      expiresInSeconds: 900,
      visitorId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      conversationId: "33333333-3333-4333-8333-333333333333",
      tenant: {
        id: "44444444-4444-4444-8444-444444444444",
        publicId: "empresa123",
        name: "Empresa 123"
      },
      config: {
        locale: "pt-BR",
        theme: "dark",
        position: "bottom-right",
        primaryColor: "#111111",
        initialMessage: "Bem-vindo",
        placeholder: "Escreva aqui",
        width: 390,
        height: 640
      }
    });
    element.open();
    await element.updateComplete;

    expect(storedEvents).toHaveLength(1);
    expect(element.dataset.theme).toBe("dark");
    expect(element.shadowRoot?.querySelector(".title")?.textContent).toBe("Empresa 123");
    expect(localStorage.getItem("faqchatbot:widget-session")).toContain("22222222-2222-4222-8222-222222222222");

    element.remove();
  });

  it("uses the system theme when setTheme is called without an override", async () => {
    const element = await createElement();

    element.setTheme();
    await element.updateComplete;

    expect(element.getAttribute("data-theme")).toBe("light");
    element.remove();
  });

  it("restores the dark system theme when the browser prefers dark mode", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;

    try {
      const element = await createElement();
      element.setTheme();
      await element.updateComplete;

      expect(element.getAttribute("data-theme")).toBe("dark");
      element.remove();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("drops malformed stored session payloads", async () => {
    localStorage.setItem("faqchatbot:widget-session", "{");

    const element = await createElement();

    expect(localStorage.getItem("faqchatbot:widget-session")).toBe(null);
    element.remove();
  });

  it("handles storage being unavailable", async () => {
    const storageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    const storageSpy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    try {
      const element = await createElement();
      element.hydrateSession({
        accessToken: "token",
        expiresInSeconds: 900,
        visitorId: "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
        conversationId: "33333333-3333-4333-8333-333333333333",
        tenant: {
          id: "44444444-4444-4444-8444-444444444444",
          publicId: "empresa123",
          name: "Empresa 123"
        },
        config: {
          locale: "pt-BR",
          theme: "auto",
          position: "bottom-right",
          primaryColor: "#111111",
          initialMessage: "Bem-vindo",
          placeholder: "Escreva aqui",
          width: 390,
          height: 640
        }
      });
      await element.updateComplete;

      expect(element.getAttribute("data-theme")).toBe("light");
      element.remove();
    } finally {
      storageSpy.mockRestore();
      if (storageDescriptor) {
        Object.defineProperty(window, "localStorage", storageDescriptor);
      }
    }
  });
});
