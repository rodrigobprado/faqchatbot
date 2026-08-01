import { describe, expect, it, vi } from "vitest";
import { WidgetSessionController } from "./widget-session.controller.js";

describe("WidgetSessionController", () => {
  it("forwards the session start call to the service", async () => {
    const service = {
      start: vi.fn().mockResolvedValue({ ok: true })
    } as unknown as ConstructorParameters<typeof WidgetSessionController>[0];

    const controller = new WidgetSessionController(service);
    const response = await controller.start(
      { agentId: "empresa123" },
      "https://example.com",
      "https://example.com/page"
    );

    expect(response).toEqual({ ok: true });
    expect(service.start).toHaveBeenCalledWith(
      { agentId: "empresa123" },
      {
        origin: "https://example.com",
        referer: "https://example.com/page"
      }
    );
  });
});
