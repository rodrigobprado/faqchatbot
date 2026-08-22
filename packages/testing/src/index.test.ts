import { describe, expect, it } from "vitest";
import {
  ADMIN_STORAGE_KEYS,
  buildChatMessage,
  buildWidgetSessionResponse,
  WIDGET_SESSION_IDS
} from "./index.js";

describe("buildWidgetSessionResponse", () => {
  it("returns a complete default response", () => {
    const response = buildWidgetSessionResponse();

    expect(response.accessToken).toBe("token");
    expect(response.conversationId).toBe(WIDGET_SESSION_IDS.conversationId);
    expect(response.config.theme).toBe("auto");
    expect(response.config.width).toBe(380);
  });

  it("applies top-level and nested config overrides", () => {
    const response = buildWidgetSessionResponse({
      accessToken: "custom",
      config: { theme: "dark", primaryColor: "#ff0000" }
    });

    expect(response.accessToken).toBe("custom");
    expect(response.config.theme).toBe("dark");
    expect(response.config.primaryColor).toBe("#ff0000");
    expect(response.config.placeholder).toBe("Digite sua mensagem");
  });
});

describe("buildChatMessage", () => {
  it("builds a default user text message", () => {
    const message = buildChatMessage();

    expect(message.role).toBe("user");
    expect(message.content).toEqual({ type: "text", text: "Ola" });
    expect(message.conversationId).toBe(WIDGET_SESSION_IDS.conversationId);
  });

  it("accepts role and content overrides", () => {
    const message = buildChatMessage({
      role: "assistant",
      content: { type: "markdown", markdown: "**Ola**" }
    });

    expect(message.role).toBe("assistant");
    expect(message.content).toEqual({ type: "markdown", markdown: "**Ola**" });
  });
});

describe("ADMIN_STORAGE_KEYS", () => {
  it("matches the keys written by the auth context", () => {
    expect(ADMIN_STORAGE_KEYS.access).toBe("faqchatbot_admin_access_token");
    expect(ADMIN_STORAGE_KEYS.refresh).toBe("faqchatbot_admin_refresh_token");
    expect(ADMIN_STORAGE_KEYS.user).toBe("faqchatbot_admin_user");
  });
});
