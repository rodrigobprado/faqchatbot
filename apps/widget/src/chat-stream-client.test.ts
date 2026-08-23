import type { ChatStreamEvent } from "@faqchatbot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openChatStream } from "./chat-stream-client.js";

const sseResponse = (chunks: string[]): Response => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          index < chunks.length
            ? { done: false, value: encoder.encode(chunks[index++]) }
            : { done: true, value: undefined }
      })
    }
  } as unknown as Response;
};

const baseOptions = {
  apiUrl: "https://api.example.com",
  accessToken: "token",
  conversationId: "22222222-2222-2222-2222-222222222222"
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openChatStream", () => {
  it("parses sse events and forwards them to the handler", async () => {
    const events: ChatStreamEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"type":"typing"}\n\n',
          'data: {"type":"token","token":"Ola"}\ndata: {"type":"token","token":" mundo"}\n\n',
          'data: {"type":"message","message":{"content":{"type":"text","text":"Ola mundo"}}}\n\n'
        ]),
      ),
    );

    await openChatStream({ ...baseOptions, onEvent: (event) => events.push(event) });

    expect(events).toEqual([
      { type: "typing" },
      { type: "token", token: "Ola" },
      { type: "token", token: " mundo" },
      { type: "message", message: { content: { type: "text", text: "Ola mundo" } } }
    ]);
  });

  it("unwraps enveloped stream events", async () => {
    const events: ChatStreamEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sseResponse(['data: {"data":{"type":"error","message":"falha"}}\n\n'])),
    );

    await openChatStream({ ...baseOptions, onEvent: (event) => events.push(event) });

    expect(events).toEqual([{ type: "error", message: "falha" }]);
  });

  it("ignores malformed payloads and comments", async () => {
    const events: ChatStreamEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sseResponse([": keepalive\n\n", "data: not-json\n\n", 'data: {"foo":1}\n\n'])),
    );

    await openChatStream({ ...baseOptions, onEvent: (event) => events.push(event) });

    expect(events).toEqual([]);
  });

  it("splits buffered events arriving in a single chunk", async () => {
    const events: ChatStreamEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sseResponse(['data: {"type":"typing"}\n\ndata: {"type":"token","token":"a"}\n\n'])),
    );

    await openChatStream({ ...baseOptions, onEvent: (event) => events.push(event) });

    expect(events).toEqual([{ type: "typing" }, { type: "token", token: "a" }]);
  });

  it("throws when the API rejects the connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, body: null }));

    await expect(openChatStream({ ...baseOptions, onEvent: () => undefined })).rejects.toThrow(
      "Failed to open chat stream (status 401)",
    );
  });

  it("throws when the response has no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: null }));

    await expect(openChatStream({ ...baseOptions, onEvent: () => undefined })).rejects.toThrow();
  });
});
