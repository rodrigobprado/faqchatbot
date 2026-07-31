import type { WidgetSessionStartRequest } from "@faqchatbot/contracts";
import { describe, expect, it, vi } from "vitest";
import type { WidgetSessionService } from "./widget-session.service.js";
import { WidgetSessionController } from "./widget-session.controller.js";

const body: WidgetSessionStartRequest = {
  agentId: "acme",
  context: {
    url: "https://acme.example.com/",
    utm: {},
    viewport: { width: 1280, height: 800 },
    timestamp: new Date().toISOString()
  }
};

describe("WidgetSessionController", () => {
  it("delegates to WidgetSessionService with the Origin, Referer headers and client IP", async () => {
    const start = vi.fn().mockResolvedValue({ accessToken: "token" });
    const controller = new WidgetSessionController({ start } as unknown as WidgetSessionService);

    const result = await controller.start(
      body,
      "https://acme.example.com",
      "https://acme.example.com/pricing",
      "203.0.113.10",
    );

    expect(start).toHaveBeenCalledWith(
      body,
      "https://acme.example.com",
      "https://acme.example.com/pricing",
      "203.0.113.10",
    );
    expect(result).toEqual({ accessToken: "token" });
  });

  it("passes through undefined headers when absent", async () => {
    const start = vi.fn().mockResolvedValue({ accessToken: "token" });
    const controller = new WidgetSessionController({ start } as unknown as WidgetSessionService);

    await controller.start(body, undefined, undefined, "203.0.113.10");

    expect(start).toHaveBeenCalledWith(body, undefined, undefined, "203.0.113.10");
  });
});
