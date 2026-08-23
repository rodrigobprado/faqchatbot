import { randomUUID } from "node:crypto";

import type {
  ChatMessage,
  MessageContent,
  WidgetSessionStartResponse
} from "@faqchatbot/contracts";

export type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}>;

export const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

export const flushPromises = async (): Promise<void> => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

export const createTestId = (prefix = "test"): string => `${prefix}-${randomUUID()}`;

export const WIDGET_SESSION_IDS = Object.freeze({
  visitorId: "11111111-1111-1111-1111-111111111111",
  sessionId: "22222222-2222-2222-2222-222222222222",
  conversationId: "33333333-3333-3333-3333-333333333333"
});

export const TENANT_ID = "44444444-4444-4444-4444-444444444444";

export type WidgetSessionResponseOverrides = Partial<Omit<WidgetSessionStartResponse, "config">> & {
  config?: Partial<WidgetSessionStartResponse["config"]>;
};

const DEFAULT_SESSION_CONFIG: WidgetSessionStartResponse["config"] = {
  locale: "pt-BR",
  theme: "auto",
  position: "bottom-right",
  primaryColor: "#2563eb",
  initialMessage: "Ola! Como posso ajudar?",
  placeholder: "Digite sua mensagem",
  width: 380,
  height: 600
};

export const buildWidgetSessionResponse = (
  overrides: WidgetSessionResponseOverrides = {},
): WidgetSessionStartResponse => {
  const { config, ...rest } = overrides;

  return {
    accessToken: "token",
    expiresInSeconds: 3600,
    ...WIDGET_SESSION_IDS,
    tenant: { id: TENANT_ID, publicId: "demo", name: "Demo Tenant" },
    ...rest,
    config: { ...DEFAULT_SESSION_CONFIG, ...config }
  };
};

export type ChatMessageOverrides = {
  id?: string;
  conversationId?: string;
  role?: ChatMessage["role"];
  content?: MessageContent;
};

export const buildChatMessage = (overrides: ChatMessageOverrides = {}): ChatMessage => ({
  id: "aaaaaaa1-1111-1111-1111-111111111111",
  conversationId: WIDGET_SESSION_IDS.conversationId,
  role: "user",
  metadata: {},
  content: { type: "text", text: "Ola" },
  ...overrides
});

export const ADMIN_STORAGE_KEYS = Object.freeze({
  access: "faqchatbot_admin_access_token",
  refresh: "faqchatbot_admin_refresh_token",
  user: "faqchatbot_admin_user"
});
