import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  type TenantPublicConfig,
  type WidgetSessionStartResponse,
  widgetSessionStartResponseSchema
} from "@faqchatbot/contracts";

export type ChatWidgetTheme = "light" | "dark" | "auto";

export type ChatWidgetIdentifyPayload = Readonly<{
  id?: string;
  nome?: string;
  email?: string;
}>;

type WidgetSessionState = Readonly<{
  visitorId: string | null;
  sessionId: string | null;
  conversationId: string | null;
}>;

type ChatMessageBubble = Readonly<{
  id: string;
  role: "assistant" | "user";
  text: string;
}>;

const STORAGE_KEY = "faqchatbot:widget-session";

const createWidgetId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultWidgetConfig: TenantPublicConfig = {
  id: "00000000-0000-4000-8000-000000000000",
  publicId: "default",
  name: "Assistente",
  status: "active",
  plan: "starter",
  domain: "localhost",
  locale: "pt-BR",
  theme: "auto",
  primaryColor: "#2563eb",
  initialMessage: "Ola! Como posso ajudar?",
  placeholder: "Digite sua mensagem",
  limits: {
    messagesPerMinute: 30,
    conversationsPerDay: 200
  }
};

const defaultSessionState = (): WidgetSessionState => ({
  visitorId: null,
  sessionId: null,
  conversationId: null
});

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const clampColor = (value: string | undefined, fallback: string): string =>
  value && value.trim() ? value.trim() : fallback;

const systemTheme = (): Exclude<ChatWidgetTheme, "auto"> => {
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

@customElement("faq-chat-widget")
export class FaqChatWidgetElement extends LitElement {
  @state()
  private isOpen = false;

  @state()
  private draft = "";

  @state()
  private themeMode: ChatWidgetTheme = defaultWidgetConfig.theme;

  @state()
  private widgetConfig: TenantPublicConfig = defaultWidgetConfig;

  @state()
  private sessionState: WidgetSessionState = defaultSessionState();

  @state()
  private messages: ChatMessageBubble[] = [
    {
      id: createWidgetId(),
      role: "assistant",
      text: defaultWidgetConfig.initialMessage
    }
  ];

  private hasFocusedInput = false;

  static override styles = css`
    :host {
      all: initial;
      box-sizing: border-box;
      color-scheme: light dark;
      font-family:
        "Inter",
        "Segoe UI",
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
      --widget-surface: #ffffff;
      --widget-surface-strong: #eff6ff;
      --widget-border: rgb(148 163 184 / 28%);
      --widget-text: #0f172a;
      --widget-muted: #64748b;
      --widget-primary: #2563eb;
      --widget-primary-contrast: #ffffff;
      --widget-shadow: 0 24px 80px rgb(15 23 42 / 30%);
    }

    :host([data-theme="dark"]) {
      --widget-surface: #0f172a;
      --widget-surface-strong: #111827;
      --widget-border: rgb(148 163 184 / 16%);
      --widget-text: #f8fafc;
      --widget-muted: #94a3b8;
      --widget-primary: #60a5fa;
      --widget-primary-contrast: #0f172a;
      --widget-shadow: 0 24px 90px rgb(2 6 23 / 55%);
    }

    .launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border: 0;
      border-radius: 999px;
      background:
        radial-gradient(circle at 30% 30%, rgb(255 255 255 / 26%), transparent 38%),
        linear-gradient(135deg, var(--widget-primary), color-mix(in srgb, var(--widget-primary) 68%, #111827));
      color: var(--widget-primary-contrast);
      box-shadow: var(--widget-shadow);
      cursor: pointer;
      font: inherit;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.02em;
      transition:
        transform 180ms ease,
        box-shadow 180ms ease;
    }

    .launcher:hover {
      transform: translateY(-1px);
      box-shadow: 0 28px 100px rgb(15 23 42 / 34%);
    }

    .launcher:focus-visible,
    .close:focus-visible,
    .send:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--widget-primary);
      outline-offset: 2px;
    }

    .launcher-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .panel {
      position: fixed;
      right: 24px;
      bottom: 94px;
      z-index: 2147483647;
      display: grid;
      grid-template-rows: auto 1fr auto;
      width: min(390px, calc(100vw - 32px));
      height: min(640px, calc(100vh - 126px));
      overflow: hidden;
      border: 1px solid var(--widget-border);
      border-radius: 20px;
      background:
        linear-gradient(180deg, rgb(255 255 255 / 4%), transparent 24%),
        var(--widget-surface);
      color: var(--widget-text);
      box-shadow: var(--widget-shadow);
      backdrop-filter: blur(14px);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--widget-border);
      background: linear-gradient(135deg, var(--widget-surface-strong), var(--widget-surface));
    }

    .heading {
      display: grid;
      gap: 2px;
    }

    .title {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 12px;
      color: var(--widget-muted);
    }

    .close {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .messages {
      display: grid;
      align-content: start;
      gap: 12px;
      padding: 16px 18px;
      overflow: auto;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--widget-primary) 10%, transparent), transparent 42%),
        var(--widget-surface);
      font-size: 14px;
      line-height: 1.55;
    }

    .message {
      max-width: 82%;
      padding: 11px 13px;
      border: 1px solid var(--widget-border);
      border-radius: 16px;
      word-break: break-word;
    }

    .message.assistant {
      justify-self: start;
      background: color-mix(in srgb, var(--widget-primary) 10%, var(--widget-surface));
    }

    .message.user {
      justify-self: end;
      background: var(--widget-primary);
      color: var(--widget-primary-contrast);
      border-color: transparent;
    }

    .composer {
      display: flex;
      gap: 10px;
      padding: 14px;
      border-top: 1px solid var(--widget-border);
      background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--widget-primary) 4%, var(--widget-surface)));
    }

    input {
      min-width: 0;
      flex: 1;
      border: 1px solid var(--widget-border);
      border-radius: 14px;
      padding: 12px 14px;
      background: var(--widget-surface);
      color: var(--widget-text);
      font: inherit;
      transition: border-color 180ms ease;
    }

    input::placeholder {
      color: var(--widget-muted);
    }

    .send {
      border: 0;
      border-radius: 14px;
      padding: 0 16px;
      background: linear-gradient(135deg, var(--widget-primary), color-mix(in srgb, var(--widget-primary) 72%, #111827));
      color: var(--widget-primary-contrast);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.restoreSessionState();
    this.syncThemeAttribute();
  }

  override updated() {
    this.syncThemeAttribute();

    if (this.isOpen && !this.hasFocusedInput) {
      this.hasFocusedInput = true;
      queueMicrotask(() => {
        const input = this.shadowRoot?.querySelector<HTMLInputElement>("#faqchatbot-message");
        input?.focus();
      });
    }
  }

  open() {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.dispatchWidgetEvent("chat-widget:open");
  }

  close() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.hasFocusedInput = false;
    this.dispatchWidgetEvent("chat-widget:close");
  }

  toggle() {
    if (this.isOpen) {
      this.close();
      return;
    }

    this.open();
  }

  send(message: string) {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return;
    }

    this.messages = [
      ...this.messages,
      {
        id: createWidgetId(),
        role: "user",
        text: normalizedMessage
      }
    ];

    this.dispatchWidgetEvent("chat-widget:message", { message: normalizedMessage });
  }

  identify(payload: ChatWidgetIdentifyPayload) {
    this.dispatchWidgetEvent("chat-widget:identify", payload);
  }

  setTheme(theme?: ChatWidgetTheme) {
    this.themeMode = theme ?? this.widgetConfig.theme ?? "auto";
    this.dispatchWidgetEvent("chat-widget:theme", { theme: this.themeMode });
  }

  hydrateSession(response: WidgetSessionStartResponse) {
    const parsed = this.parseSessionResponse(response);

    this.widgetConfig = {
      ...this.widgetConfig,
      name: parsed.tenant.name,
      locale: parsed.config.locale,
      theme: parsed.config.theme,
      primaryColor: parsed.config.primaryColor,
      initialMessage: parsed.config.initialMessage,
      placeholder: parsed.config.placeholder
    };
    this.themeMode = parsed.config.theme;
    this.sessionState = {
      visitorId: parsed.visitorId,
      sessionId: parsed.sessionId,
      conversationId: parsed.conversationId
    };
    this.messages = [
      {
        id: createWidgetId(),
        role: "assistant",
        text: parsed.config.initialMessage
      }
    ];
    this.hasFocusedInput = false;

    this.persistSessionState();
    this.syncThemeAttribute();
    this.dispatchWidgetEvent("chat-widget:connect", {
      visitorId: parsed.visitorId,
      sessionId: parsed.sessionId,
      conversationId: parsed.conversationId
    });
  }

  resetConversation() {
    this.messages = [
      {
        id: createWidgetId(),
        role: "assistant",
        text: this.widgetConfig.initialMessage
      }
    ];
    this.hasFocusedInput = false;
  }

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.send(this.draft);
    this.draft = "";
    (event.currentTarget as HTMLFormElement).reset();
  }

  private handlePanelKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  private dispatchWidgetEvent(name: string, detail?: Record<string, unknown>) {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true
      }),
    );
  }

  private parseSessionResponse(response: WidgetSessionStartResponse): WidgetSessionStartResponse {
    return widgetSessionStartResponseSchema.parse(response);
  }

  private restoreSessionState() {
    const storage = safeStorage();
    if (!storage) {
      return;
    }

    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<WidgetSessionState>;
      this.sessionState = {
        visitorId: typeof parsed.visitorId === "string" ? parsed.visitorId : null,
        sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : null,
        conversationId: typeof parsed.conversationId === "string" ? parsed.conversationId : null
      };
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }

  private persistSessionState() {
    const storage = safeStorage();
    if (!storage) {
      return;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(this.sessionState));
  }

  private syncThemeAttribute() {
    const effectiveTheme =
      this.themeMode === "auto" ? systemTheme() : this.themeMode;
    this.dataset.theme = effectiveTheme;
    this.style.setProperty("--widget-primary", clampColor(this.widgetConfig.primaryColor, "#2563eb"));
    this.style.setProperty("--widget-primary-contrast", effectiveTheme === "dark" ? "#0f172a" : "#ffffff");
  }

  override render() {
    const effectiveTheme = this.themeMode === "auto" ? systemTheme() : this.themeMode;
    const messagePlaceholder = this.widgetConfig.placeholder || "Digite sua mensagem";
    const sessionLabel = this.sessionState.sessionId ? "Sessao retomada" : "Nova conversa";

    return html`
      <div class="sr-only" aria-live="polite">${sessionLabel}</div>
      ${this.isOpen
          ? html`<section id="faqchatbot-panel" class="panel" aria-label="Chat" aria-modal="false" @keydown=${this.handlePanelKeyDown}>
            <header>
              <div class="heading">
                <span class="title">${this.widgetConfig.name}</span>
                <span class="subtitle">${sessionLabel} · ${effectiveTheme}</span>
              </div>
              <button class="close" type="button" aria-label="Fechar chat" @click=${this.close}>
                ×
              </button>
            </header>
            <main class="messages" aria-live="polite" aria-label="Mensagens do chat">
              ${this.messages.map(
                (message) => html`<article class="message ${message.role}">
                  ${message.text}
                </article>`,
              )}
            </main>
            <form class="composer" @submit=${this.handleSubmit}>
              <label class="sr-only" for="faqchatbot-message">Mensagem</label>
              <input
                id="faqchatbot-message"
                aria-label="Mensagem"
                placeholder=${messagePlaceholder}
                .value=${this.draft}
                @input=${(event: InputEvent) => {
                  this.draft = (event.target as HTMLInputElement).value;
                }}
              />
              <button class="send" type="submit">Enviar</button>
            </form>
          </section>`
        : null}
      <button
        class="launcher"
        type="button"
        aria-label="Abrir chat"
        aria-haspopup="dialog"
        aria-controls="faqchatbot-panel"
        aria-expanded=${String(this.isOpen)}
        @click=${this.toggle}
      >
        <span class="launcher-mark">AI</span>
      </button>
    `;
  }
}
