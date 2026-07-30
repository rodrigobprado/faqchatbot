import { describe, expect, it } from "vitest";
import { internalEventSchema } from "./internal-events.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const occurredAt = "2026-07-30T12:00:00.000Z";

describe("internalEventSchema", () => {
  it("accepts a WidgetSessionStarted event", () => {
    const event = internalEventSchema.parse({
      type: "WidgetSessionStarted",
      tenantId,
      occurredAt,
      visitorId: "33333333-3333-4333-8333-333333333333",
      sessionId: "44444444-4444-4444-8444-444444444444",
      conversationId
    });

    expect(event.type).toBe("WidgetSessionStarted");
  });

  it("accepts a RateLimitExceeded event without tenantId for anonymous IP scope", () => {
    const event = internalEventSchema.parse({
      type: "RateLimitExceeded",
      occurredAt,
      scope: "ip"
    });

    expect(event.type).toBe("RateLimitExceeded");
  });

  it("accepts an AgentRoutingFailed event with a reason", () => {
    const event = internalEventSchema.parse({
      type: "AgentRoutingFailed",
      tenantId,
      occurredAt,
      conversationId,
      provider: "n8n",
      reason: "timeout"
    });

    expect(event.type).toBe("AgentRoutingFailed");
  });

  it("rejects an unknown event type", () => {
    expect(() =>
      internalEventSchema.parse({ type: "SomethingElse", tenantId, occurredAt }),
    ).toThrow();
  });

  it("rejects an event missing occurredAt", () => {
    expect(() => internalEventSchema.parse({ type: "ConversationStarted", tenantId })).toThrow();
  });
});
