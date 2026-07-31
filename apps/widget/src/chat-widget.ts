import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { collectPageContext } from "./page-context.js";
import { startWidgetSession } from "./session-client.js";
import { loadStoredSessionIds, saveStoredSessionIds } from "./session-storage.js";

export type ChatWidgetIdentifyPayload = Readonly<{
  id?: string;
  nome?: string;
  email?: string;
}>;

type WidgetTheme = "light" | "dark" | "auto";

const DEFAULT_INITIAL_MESSAGE = "Ola! Como posso ajudar?";
const DEFAULT_PLACEHOLDER = "Digite sua mensagem";
const DEFAULT_PRIMARY_COLOR = "#2563eb";

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
  private placeholder = DEFAULT_PLACEHOLDER;

  private accessToken: string | null = null;

  @query(".launcher")
  private launcherButton?: HTMLButtonElement;

  @query(".panel input")
  private messageInput?: HTMLInputElement;

  static override styles = css`
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
      this.initialMessage = result.config.initialMessage;
      this.placeholder = result.config.placeholder;
      this.applyTheme(result.config.theme, result.config.primaryColor);
      this.isSessionConnected = true;

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

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.send(this.draft);
    this.draft = "";
    (event.currentTarget as HTMLFormElement).reset();
  }

  override render() {
    return html`
      ${this.isOpen
        ? html`<section class="panel" aria-label="Chat" @keydown=${this.handleKeydown}>
            <header>
              <span>Assistente</span>
              <button class="close" type="button" aria-label="Fechar chat" @click=${this.close}>
                x
              </button>
            </header>
            <main class="messages" aria-live="polite">${this.initialMessage}</main>
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
          </section>`
        : null}
      <button class="launcher" type="button" aria-label="Abrir chat" @click=${this.toggle}>AI</button>
    `;
  }
}
