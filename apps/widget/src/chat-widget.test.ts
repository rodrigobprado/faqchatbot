import { describe, expect, it } from "vitest";
import "./chat-widget.js";
import type { FaqChatWidgetElement } from "./chat-widget.js";

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
