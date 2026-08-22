export type ChatWidgetIdentifyPayload = Readonly<{
  id?: string;
  nome?: string;
  email?: string;
}>;

export type ChatWidgetPublicApi = Readonly<{
  open(): void;
  close(): void;
  toggle(): void;
  send(message: string): void;
  identify(payload: ChatWidgetIdentifyPayload): void;
  setTheme(): void;
  destroy(): void;
}>;

export type LoadChatWidgetOptions = Readonly<{
  agentId: string;
  apiUrl: string;
  scriptUrl?: string;
  documentRef?: Document;
  windowRef?: Window & { ChatWidget?: ChatWidgetPublicApi };
}>;

export type WidgetScriptOptions = Readonly<{
  src: string;
  agentId: string;
  async?: boolean;
  nonce?: string;
  attributes?: Readonly<Record<string, string>>;
}>;

declare global {
  interface Window {
    ChatWidget?: ChatWidgetPublicApi;
  }
}

type WindowWithWidget = Window & { ChatWidget?: ChatWidgetPublicApi };

const resolveWindow = (options: LoadChatWidgetOptions): WindowWithWidget =>
  options.windowRef ?? ((globalThis as { window?: WindowWithWidget }).window ?? (globalThis as unknown as WindowWithWidget));

const resolveDocument = (options: LoadChatWidgetOptions): Document =>
  options.documentRef ?? document;

export const widgetScriptUrl = (apiUrl: string): string => new URL("/widget.js", apiUrl).toString();

const escapeAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const buildWidgetScriptUrl = (options: Pick<WidgetScriptOptions, "src" | "agentId">): string => {
  const url = new URL(options.src);
  url.searchParams.set("data-agent", options.agentId);
  return url.toString();
};

export const buildWidgetSnippet = (options: WidgetScriptOptions): string => {
  const url = buildWidgetScriptUrl(options);
  const attributes = [
    `src="${escapeAttribute(url)}"`,
    `data-agent="${escapeAttribute(options.agentId)}"`
  ];

  if (options.async !== false) {
    attributes.push("async");
  }

  if (options.nonce) {
    attributes.push(`nonce="${escapeAttribute(options.nonce)}"`);
  }

  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    attributes.push(`${escapeAttribute(name)}="${escapeAttribute(value)}"`);
  }

  return `<script ${attributes.join(" ")}></script>`;
};

export const loadChatWidget = async (options: LoadChatWidgetOptions): Promise<ChatWidgetPublicApi> => {
  const windowRef = resolveWindow(options);
  const doc = resolveDocument(options);

  if (windowRef.ChatWidget) {
    return windowRef.ChatWidget;
  }

  if (!options.agentId) {
    throw new Error("loadChatWidget requires an agentId");
  }

  const existingScript = doc.querySelector<HTMLScriptElement>("script[data-faqchatbot-loader]");
  if (existingScript) {
    throw new Error("Chat widget script is already being loaded");
  }

  const script = doc.createElement("script");
  script.src = options.scriptUrl ?? widgetScriptUrl(options.apiUrl);
  script.async = true;
  script.setAttribute("data-agent", options.agentId);
  script.setAttribute("data-api-url", options.apiUrl);
  script.setAttribute("data-faqchatbot-loader", "true");

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load chat widget script from ${script.src}`));
    };
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    doc.head.appendChild(script);
  });

  if (!windowRef.ChatWidget) {
    throw new Error("Chat widget script loaded but the public API is unavailable");
  }

  return windowRef.ChatWidget;
};
