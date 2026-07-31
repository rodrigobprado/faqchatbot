import { describe, expect, it, vi } from "vitest";
import type { WidgetTokenClaims } from "../auth/access-token-claims.js";
import type { AuthenticatedWidgetRequest } from "../auth/guards/widget-jwt.guard.js";
import { ChatController } from "./chat.controller.js";
import type { ChatService } from "./chat.service.js";

const claims: WidgetTokenClaims = {
  sub: "visitor-1",
  tenantId: "tenant-1",
  sessionId: "session-1",
  conversationId: "conversation-1",
  scope: "widget"
};

describe("ChatController", () => {
  it("delegates sendMessage to ChatService with the authenticated claims", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ id: "message-1" });
    const controller = new ChatController({ sendMessage } as unknown as ChatService);
    const request = { user: claims } as AuthenticatedWidgetRequest;
    const body = { conversationId: claims.conversationId, content: { type: "text", text: "Ola" } };

    const result = await controller.sendMessage(request, body);

    expect(sendMessage).toHaveBeenCalledWith(claims, body);
    expect(result).toEqual({ id: "message-1" });
  });

  it("delegates stream to ChatService", () => {
    const stream = vi.fn().mockReturnValue("observable");
    const controller = new ChatController({ stream } as unknown as ChatService);
    const request = { user: claims } as AuthenticatedWidgetRequest;

    const result = controller.stream(request, claims.conversationId);

    expect(stream).toHaveBeenCalledWith(claims, claims.conversationId);
    expect(result).toBe("observable");
  });

  it("delegates history to ChatService", async () => {
    const getHistory = vi.fn().mockResolvedValue([]);
    const controller = new ChatController({ getHistory } as unknown as ChatService);
    const request = { user: claims } as AuthenticatedWidgetRequest;

    const result = await controller.history(request, claims.conversationId);

    expect(getHistory).toHaveBeenCalledWith(claims, claims.conversationId);
    expect(result).toEqual([]);
  });

  it("delegates buttonClicked to ChatService", () => {
    const recordButtonClick = vi.fn();
    const controller = new ChatController({ recordButtonClick } as unknown as ChatService);
    const request = { user: claims } as AuthenticatedWidgetRequest;
    const body = { conversationId: claims.conversationId, buttonId: "cta-1" };

    controller.buttonClicked(request, body);

    expect(recordButtonClick).toHaveBeenCalledWith(claims, body);
  });

  it("delegates endConversation to ChatService", async () => {
    const endConversation = vi.fn().mockResolvedValue(undefined);
    const controller = new ChatController({ endConversation } as unknown as ChatService);
    const request = { user: claims } as AuthenticatedWidgetRequest;
    const body = { reason: "resolved" as const };

    await controller.endConversation(request, claims.conversationId, body);

    expect(endConversation).toHaveBeenCalledWith(claims, claims.conversationId, body);
  });
});
