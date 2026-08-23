import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentRequest, TenantAgentConfigRow, WebhookEndpointRow } from "./agent-adapter.js";
import { AgentRoutingError } from "./agent-adapter.js";
import { N8nAgentAdapter } from "./n8n-agent.adapter.js";

const request: AgentRequest = {
  tenantId: "tenant-1",
  conversationId: "conversation-1",
  visitorId: "visitor-1",
  message: { type: "text", text: "Ola" }
};

const config = { timeoutMs: 5000 } as TenantAgentConfigRow;
const webhook = {
  url: "https://n8n.internal.example.com/webhook/super-secret-path",
  secretRef: "super-secret-value"
} as WebhookEndpointRow;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("N8nAgentAdapter", () => {
  it("posts the normalized request with the webhook secret header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: "Oi!" })
    });
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new N8nAgentAdapter();

    const result = await adapter.send(request, config, webhook);

    expect(fetchMock).toHaveBeenCalledWith(
      webhook.url,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Webhook-Secret": webhook.secretRef }),
        body: JSON.stringify({
          tenantId: request.tenantId,
          conversationId: request.conversationId,
          visitorId: request.visitorId,
          message: "Ola"
        })
      }),
    );
    expect(result.content).toEqual({ type: "text", text: "Oi!" });
  });

  it("throws without leaking the webhook URL or secret when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error(`connect ECONNREFUSED ${webhook.url} secret=${webhook.secretRef}`)),
    );
    const adapter = new N8nAgentAdapter();

    await expect(adapter.send(request, config, webhook)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AgentRoutingError);
      const message = (error as Error).message;
      expect(message).not.toContain(webhook.url);
      expect(message).not.toContain(webhook.secretRef);
      return true;
    });
  });

  it("throws a generic error when the webhook responds with a non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    const adapter = new N8nAgentAdapter();

    await expect(adapter.send(request, config, webhook)).rejects.toBeInstanceOf(AgentRoutingError);
  });

  it("throws when no webhook is configured for the tenant", async () => {
    const adapter = new N8nAgentAdapter();

    await expect(adapter.send(request, config, null)).rejects.toBeInstanceOf(AgentRoutingError);
  });

  it("aborts the request once the configured timeout elapses", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal ?? undefined;
      return new Promise(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new N8nAgentAdapter();

    void adapter.send(request, { ...config, timeoutMs: 100 } as TenantAgentConfigRow, webhook);
    await vi.advanceTimersByTimeAsync(150);

    expect(capturedSignal?.aborted).toBe(true);
  });
});
