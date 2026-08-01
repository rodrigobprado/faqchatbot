import { describe, expect, it, vi } from "vitest";
import { ChatController } from "./chat.controller.js";

describe("ChatController", () => {
  it("forwards send and history calls to the service", async () => {
    const service = {
      sendMessage: vi.fn().mockResolvedValue({ exchange: true }),
      getHistory: vi.fn().mockResolvedValue({ messages: [] }),
      buildStream: vi.fn().mockResolvedValue("event: done\ndata: {}\n\n")
    } as unknown as ConstructorParameters<typeof ChatController>[0];

    const controller = new ChatController(service);
    const widgetUser = {
      conversationId: "00000000-0000-4000-8000-000000000001"
    };
    const request = {
      widgetUser
    } as never;

    await expect(controller.send(request, { content: { type: "text", text: "Ola" } })).resolves.toEqual({
      exchange: true
    });
    await expect(controller.history(request, "00000000-0000-4000-8000-000000000001")).resolves.toEqual({
      messages: []
    });
    expect(service.sendMessage).toHaveBeenCalledWith(widgetUser, { content: { type: "text", text: "Ola" } });
    expect(service.getHistory).toHaveBeenCalledWith(widgetUser, "00000000-0000-4000-8000-000000000001");
  });

  it("writes SSE payloads directly to the response", async () => {
    const service = {
      sendMessage: vi.fn(),
      getHistory: vi.fn(),
      buildStream: vi.fn().mockResolvedValue("event: done\ndata: {}\n\n")
    } as unknown as ConstructorParameters<typeof ChatController>[0];

    const controller = new ChatController(service);
    const widgetUser = {
      conversationId: "00000000-0000-4000-8000-000000000001"
    };
    const reply = {
      raw: {
        setHeader: vi.fn(),
        end: vi.fn(),
        statusCode: 0
      }
    } as never;

    await controller.stream(
      {
        widgetUser
      } as never,
      "00000000-0000-4000-8000-000000000001",
      reply,
    );

    expect(service.buildStream).toHaveBeenCalledWith(
      widgetUser,
      "00000000-0000-4000-8000-000000000001"
    );
    expect(reply.raw.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream; charset=utf-8");
    expect(reply.raw.end).toHaveBeenCalledWith("event: done\ndata: {}\n\n");
  });
});
