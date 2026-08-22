import type { ChatStreamEvent } from "@faqchatbot/contracts";

export type ChatStreamOptions = Readonly<{
  apiUrl: string;
  accessToken: string;
  conversationId: string;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}>;

const normalizeStreamEvent = (raw: unknown): ChatStreamEvent | null => {
  const envelope = raw as { data?: unknown };
  const event = (
    typeof envelope?.data === "object" && envelope.data !== null && "type" in envelope.data
      ? envelope.data
      : raw
  ) as Partial<ChatStreamEvent>;

  return typeof event.type === "string" ? (event as ChatStreamEvent) : null;
};

const parseSseChunk = (chunk: string): unknown[] =>
  chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => {
      try {
        return JSON.parse(line.slice(5).trim());
      } catch {
        return null;
      }
    })
    .filter((payload) => payload !== null);

export const openChatStream = async (options: ChatStreamOptions): Promise<void> => {
  const response = await fetch(`${options.apiUrl}/v1/chat/stream/${options.conversationId}`, {
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${options.accessToken}`
    },
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to open chat stream (status ${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const payloads = parseSseChunk(chunk);
      for (const payload of payloads) {
        const event = normalizeStreamEvent(payload);
        if (event) {
          options.onEvent(event);
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
};
