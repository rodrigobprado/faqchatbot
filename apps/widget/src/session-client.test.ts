import type { WidgetSessionStartRequest, WidgetSessionStartResponse } from "@faqchatbot/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startWidgetSession } from "./session-client.js";

const request: WidgetSessionStartRequest = {
  agentId: "acme",
  context: {
    url: "https://client.example.com/",
    utm: {},
    viewport: { width: 1280, height: 800 },
    timestamp: new Date().toISOString()
  }
};

const response: WidgetSessionStartResponse = {
  accessToken: "token",
  expiresInSeconds: 3600,
  visitorId: "11111111-1111-1111-1111-111111111111",
  sessionId: "22222222-2222-2222-2222-222222222222",
  conversationId: "33333333-3333-3333-3333-333333333333",
  tenant: { id: "44444444-4444-4444-4444-444444444444", publicId: "acme", name: "Acme Inc" },
  config: {
    locale: "pt-BR",
    theme: "auto",
    position: "bottom-right",
    primaryColor: "#2563eb",
    initialMessage: "Ola!",
    placeholder: "Digite sua mensagem",
    width: 380,
    height: 600
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startWidgetSession", () => {
  it("posts the request to the API and returns the unwrapped response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: response })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await startWidgetSession("https://api.example.com", request);

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v1/widget/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    expect(result).toEqual(response);
  });

  it("accepts payloads without the envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(response) }),
    );

    const result = await startWidgetSession("https://api.example.com", request);

    expect(result).toEqual(response);
  });

  it("throws when the API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({}) }),
    );

    await expect(startWidgetSession("https://api.example.com", request)).rejects.toThrow();
  });
});
