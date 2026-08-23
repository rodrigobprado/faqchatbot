import type { ChatMessage } from "@faqchatbot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChatHistory, sendChatMessage } from "./chat-client.js";

const message: ChatMessage = {
  id: "11111111-1111-1111-1111-111111111111",
  conversationId: "22222222-2222-2222-2222-222222222222",
  role: "user",
  metadata: {},
  content: { type: "text", text: "Ola" }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChatMessage", () => {
  it("posts the message with the widget bearer token and unwraps the envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: message })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChatMessage(
      "https://api.example.com",
      "token",
      "22222222-2222-2222-2222-222222222222",
      "Ola"
    );

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v1/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token"
      },
      body: JSON.stringify({
        conversationId: "22222222-2222-2222-2222-222222222222",
        content: { type: "text", text: "Ola" }
      })
    });
    expect(result).toEqual(message);
  });

  it("throws when the API rejects the message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(sendChatMessage("https://api.example.com", "token", "22222222-2222-2222-2222-222222222222", "Ola"))
      .rejects.toThrow("Failed to send message (status 403)");
  });
});

describe("fetchChatHistory", () => {
  it("returns the conversation messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { messages: [message] } })
    });
    vi.stubGlobal("fetch", fetchMock);

    const history = await fetchChatHistory(
      "https://api.example.com",
      "token",
      "22222222-2222-2222-2222-222222222222"
    );

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v1/chat/history/22222222-2222-2222-2222-222222222222", {
      headers: { Authorization: "Bearer token" }
    });
    expect(history).toEqual([message]);
  });

  it("returns an empty list when the payload has no messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );

    const history = await fetchChatHistory("https://api.example.com", "token", "22222222-2222-2222-2222-222222222222");

    expect(history).toEqual([]);
  });

  it("throws when the API rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(fetchChatHistory("https://api.example.com", "token", "22222222-2222-2222-2222-222222222222"))
      .rejects.toThrow("Failed to load chat history (status 401)");
  });
});
