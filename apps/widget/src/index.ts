import "./chat-widget.js";
import type { ChatWidgetIdentifyPayload, FaqChatWidgetElement } from "./chat-widget.js";
import { readWidgetConfig } from "./widget-config.js";

declare const __API_URL__: string;

export type ChatWidgetPublicApi = Readonly<{
  open(): void;
  close(): void;
  toggle(): void;
  send(message: string): void;
  identify(payload: ChatWidgetIdentifyPayload): void;
  setTheme(): void;
  destroy(): void;
}>;

declare global {
  interface Window {
    ChatWidget?: ChatWidgetPublicApi;
  }
}

const mount = () => {
  const existing = document.querySelector<FaqChatWidgetElement>("faq-chat-widget");
  if (existing) {
    return existing;
  }

  const config = readWidgetConfig(document.currentScript as HTMLScriptElement | null, __API_URL__);
  const element = document.createElement("faq-chat-widget") as FaqChatWidgetElement;
  element.agentId = config.agentId;
  element.apiUrl = config.apiUrl;
  document.body.append(element);
  return element;
};

const element = mount();

window.ChatWidget = Object.freeze({
  open: () => element.open(),
  close: () => element.close(),
  toggle: () => element.toggle(),
  send: (message: string) => element.send(message),
  identify: (payload: ChatWidgetIdentifyPayload) => element.identify(payload),
  setTheme: () => element.setTheme(),
  destroy: () => {
    element.remove();
    delete window.ChatWidget;
  }
});

