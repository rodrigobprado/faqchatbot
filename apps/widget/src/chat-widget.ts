import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import type { ChatMessage, ChatStreamEvent } from "@faqchatbot/contracts";
import { collectPageContext } from "./page-context.js";
import { fetchChatHistory, sendChatMessage } from "./chat-client.js";
import { openChatStream } from "./chat-stream-client.js";
import { startWidgetSession } from "./session-client.js";
import { loadStoredSessionIds, saveStoredSessionIds } from "./session-storage.js";
import { describeMessageContent } from "./message-display.js";

export type ChatWidgetIdentifyPayload = Readonly<{
  id?: string;
  nome?: string;
  email?: string;
}>;

type WidgetTheme = "light" | "dark" | "auto";

type WidgetChatEntry = Readonly<{
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
}>;

const DEFAULT_INITIAL_MESSAGE = "Ola! Como posso ajudar?";
const DEFAULT_PLACEHOLDER = "Digite sua mensagem";
const DEFAULT_PRIMARY_COLOR = "#2563eb";
const GENERIC_ERROR_MESSAGE = "Nao foi possivel enviar sua mensagem agora.";

@customElement("faq-chat-widget")
export class FaqChatWidgetElement extends LitElement {
  agentId: string | null = null;
  apiUrl = "";

  @state()
  private isOpen = false;

  @state()
  private draft = "";

  @state()
  private isSessionConnected = false;

  @state()
  private initialMessage = DEFAULT_INITIAL_MESSAGE;

  @state()
  private tenantName = "";

  @state()
  private placeholder = DEFAULT_PLACEHOLDER;

  @state()
  private entries: WidgetChatEntry[] = [];

  @state()
  private isTyping = false;

  @state()
  private streamingText = "";

  private accessToken: string | null = null;
  private conversationId: string | null = null;
  private streamAbortController: AbortController | null = null;

  @query(".launcher")
  private readonly launcherButton?: HTMLButtonElement;

  @query(".panel input")
  private readonly messageInput?: HTMLInputElement;

  static override readonly styles = css`
    :host {
      all: initial;
      color-scheme: light dark;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483647;
      width: 56px;
      height: 56px;
      border: 0;
      border-radius: 50%;
      background: var(--faq-primary-color, #2563eb);
      color: #ffffff;
      box-shadow: 0 18px 45px rgb(15 23 42 / 25%);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }

    .panel {
      position: fixed;
      right: 24px;
      bottom: 92px;
      z-index: 2147483647;
      display: grid;
      grid-template-rows: auto 1fr auto;
      width: min(380px, calc(100vw - 32px));
      height: min(620px, calc(100vh - 124px));
      overflow: hidden;
      border: 1px solid rgb(148 163 184 / 35%);
      border-radius: 8px;
      background: Canvas;
      color: CanvasText;
      box-shadow: 0 24px 80px rgb(15 23 42 / 28%);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid rgb(148 163 184 / 25%);
      font-weight: 700;
    }

    .messages {
      padding: 16px;
      overflow: auto;
      font-size: 14px;
      line-height: 1.5;
    }

    .msg {
      margin: 0 0 10px;
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      background: rgb(148 163 184 / 18%);
    }

    .msg--user {
      margin-left: auto;
      background: var(--faq-primary-color, #2563eb);
      color: #ffffff;
    }

    .typing::after {
      content: "...";
      animation: faq-typing 1s steps(3, end) infinite;
    }

    @keyframes faq-typing {
      50% {
        opacity: 0.4;
      }
    }

    form {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid rgb(148 163 184 / 25%);
    }

    input {
      min-width: 0;
      flex: 1;
      border: 1px solid rgb(148 163 184 / 45%);
      border-radius: 6px;
      padding: 10px 12px;
      font: inherit;
      background: Canvas;
      color: CanvasText;
    }

    button {
      font: inherit;
    }

    .send {
      border: 0;
      border-radius: 6px;
      padding: 0 14px;
      background: var(--faq-primary-color, #2563eb);
      color: #ffffff;
      cursor: pointer;
    }

    .close {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 20px;
    }
  `;

  open() {
    this.isOpen = true;
    this.dispatchEvent(new CustomEvent("chat-widget:open", { bubbles: true, composed: true }));
    void this.updateComplete.then(() => this.messageInput?.focus());
  }

  close() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent("chat-widget:close", { bubbles: true, composed: true }));
    void this.updateComplete.then(() => this.launcherButton?.focus());
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.close();
    }
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

    this.dispatchEvent(
      new CustomEvent("chat-widget:message", {
        detail: { message: normalizedMessage },
        bubbles: true,
        composed: true
      }),
    );

    void this.deliverMessage(normalizedMessage);
  }

  identify(payload: ChatWidgetIdentifyPayload) {
    this.dispatchEvent(
      new CustomEvent("chat-widget:identify", {
        detail: payload,
        bubbles: true,
        composed: true
      }),
    );
  }

  setTheme(theme?: WidgetTheme, primaryColor?: string) {
    if (theme) {
      this.applyTheme(theme, primaryColor ?? DEFAULT_PRIMARY_COLOR);
    }
    this.dispatchEvent(new CustomEvent("chat-widget:theme", { bubbles: true, composed: true }));
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.connect();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.streamAbortController?.abort();
    this.streamAbortController = null;
  }

  async connect(): Promise<void> {
    if (!this.agentId) {
      return;
    }

    const stored = loadStoredSessionIds(this.agentId);

    try {
      const result = await startWidgetSession(this.apiUrl, {
        agentId: this.agentId,
        visitorId: stored.visitorId,
        sessionId: stored.sessionId,
        conversationId: stored.conversationId,
        context: collectPageContext()
      });

      saveStoredSessionIds(this.agentId, {
        visitorId: result.visitorId,
        sessionId: result.sessionId,
        conversationId: result.conversationId
      });

      this.accessToken = result.accessToken;
      this.conversationId = result.conversationId;
      this.initialMessage = result.config.initialMessage || DEFAULT_INITIAL_MESSAGE;
      this.tenantName = result.tenant?.name || "";
      this.placeholder = result.config.placeholder || DEFAULT_PLACEHOLDER;
      this.applyTheme(result.config.theme, result.config.primaryColor);
      this.isSessionConnected = true;

      await this.loadHistory(result.accessToken, result.conversationId);
      this.openStream(result.accessToken, result.conversationId);

      this.dispatchEvent(new CustomEvent("chat-widget:connect", { bubbles: true, composed: true }));
      this.dispatchEvent(
        new CustomEvent("chat-widget:conversation-start", {
          detail: { conversationId: result.conversationId },
          bubbles: true,
          composed: true
        }),
      );
    } catch (error) {
      this.isSessionConnected = false;
      this.dispatchEvent(
        new CustomEvent("chat-widget:error", {
          detail: { message: error instanceof Error ? error.message : "Unknown error" },
          bubbles: true,
          composed: true
        }),
      );
    }
  }

  private applyTheme(theme: WidgetTheme, primaryColor: string) {
    this.style.setProperty("--faq-primary-color", primaryColor);
    this.style.colorScheme = theme === "auto" ? "light dark" : theme;
  }

  private async loadHistory(accessToken: string, conversationId: string): Promise<void> {
    try {
      const messages = await fetchChatHistory(this.apiUrl, accessToken, conversationId);
      this.entries = messages.map((message, index) => this.toEntry(message, index));
    } catch {
      this.entries = [];
    }
  }

  private openStream(accessToken: string, conversationId: string): void {
    this.streamAbortController?.abort();
    const controller = new AbortController();
    this.streamAbortController = controller;

    void openChatStream({
      apiUrl: this.apiUrl,
      accessToken,
      conversationId,
      signal: controller.signal,
      onEvent: (event) => this.handleStreamEvent(event)
    }).catch(() => undefined);
  }

  private handleStreamEvent(event: ChatStreamEvent): void {
    switch (event.type) {
      case "typing":
        this.isTyping = true;
        break;
      case "token":
        this.isTyping = false;
        this.streamingText = `${this.streamingText}${this.streamingText ? " " : ""}${event.token}`;
        break;
      case "message":
        this.isTyping = false;
        this.streamingText = "";
        this.entries = [
          ...this.entries,
          {
            id: event.message.id ?? `assistant-${this.entries.length}`,
            role: "assistant",
            text: describeMessageContent(event.message.content)
          }
        ];
        break;
      case "error":
        this.isTyping = false;
        break;
    }
  }

  private toEntry(message: ChatMessage, index: number): WidgetChatEntry {
    if (message.role === "user") {
      return { id: message.id ?? `user-${index}`, role: "user", text: describeMessageContent(message.content) };
    }

    return {
      id: message.id ?? `assistant-${index}`,
      role: "assistant",
      text: describeMessageContent(message.content)
    };
  }

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.send(this.draft);
    this.draft = "";
    (event.currentTarget as HTMLFormElement).reset();
  }

  private appendEntry(entry: WidgetChatEntry): void {
    this.entries = [...this.entries, entry];
  }

  private async deliverMessage(text: string): Promise<void> {
    if (!this.isSessionConnected || !this.accessToken || !this.conversationId) {
      return;
    }

    this.appendEntry({ id: `local-${Date.now()}`, role: "user", text });
    this.isTyping = true;

    try {
      await sendChatMessage(this.apiUrl, this.accessToken, this.conversationId, text);
    } catch (error) {
      this.isTyping = false;
      this.appendEntry({ id: `error-${Date.now()}`, role: "system", text: GENERIC_ERROR_MESSAGE });
      this.dispatchEvent(
        new CustomEvent("chat-widget:error", {
          detail: { message: error instanceof Error ? error.message : "Unknown error" },
          bubbles: true,
          composed: true
        }),
      );
    }
  }

  private scrollToBottom(): void {
    const container = this.renderRoot.querySelector(".messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("entries") ||
      changedProperties.has("streamingText") ||
      changedProperties.has("isTyping") ||
      changedProperties.has("isOpen")
    ) {
      this.scrollToBottom();
    }
  }

  override render() {
    const launcher = html`
      <button class="launcher" type="button" aria-label="Abrir chat" @click=${this.toggle}>AI</button>
    `;

    if (!this.isOpen) {
      return launcher;
    }

    return html`
      <section class="panel" aria-label="Chat" @keydown=${this.handleKeydown}>
        <header>
          <span>${this.tenantName || "Assistente"}</span>
          <button class="close" type="button" aria-label="Fechar chat" @click=${this.close}>
            x
          </button>
        </header>
        <div class="messages" role="log" aria-live="polite">
          <p class="msg msg--assistant">${this.initialMessage}</p>
          ${this.entries.map(
            (entry) =>
              entry.text
                ? html`<p class="msg msg--${entry.role}" data-entry-id=${entry.id}>${entry.text}</p>`
                : null,
          )}
          ${this.streamingText ? html`<p class="msg msg--assistant">${this.streamingText}</p>` : null}
          ${this.isTyping ? html`<p class="msg typing">Digitando</p>` : null}
        </div>
        <form @submit=${this.handleSubmit}>
          <input
            aria-label="Mensagem"
            placeholder=${this.placeholder}
            .value=${this.draft}
            @input=${(event: InputEvent) => {
              this.draft = (event.target as HTMLInputElement).value;
            }}
          />
          <button class="send" type="submit">Enviar</button>
        </form>
      </section>
      ${launcher}
    `;
  }
}
