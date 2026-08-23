import { beforeEach, describe, expect, it } from "vitest";
import { loadStoredSessionIds, saveStoredSessionIds } from "./session-storage.js";

beforeEach(() => {
  window.localStorage.clear();
});

describe("session-storage", () => {
  it("returns an empty object when nothing was stored yet", () => {
    expect(loadStoredSessionIds("acme")).toEqual({});
  });

  it("saves and reloads the identifiers for a given agent", () => {
    saveStoredSessionIds("acme", {
      visitorId: "visitor-1",
      sessionId: "session-1",
      conversationId: "conversation-1"
    });

    expect(loadStoredSessionIds("acme")).toEqual({
      visitorId: "visitor-1",
      sessionId: "session-1",
      conversationId: "conversation-1"
    });
  });

  it("keeps identifiers isolated per agentId", () => {
    saveStoredSessionIds("acme", { visitorId: "visitor-acme", sessionId: "s1", conversationId: "c1" });
    saveStoredSessionIds("globex", { visitorId: "visitor-globex", sessionId: "s2", conversationId: "c2" });

    expect(loadStoredSessionIds("acme").visitorId).toBe("visitor-acme");
    expect(loadStoredSessionIds("globex").visitorId).toBe("visitor-globex");
  });

  it("returns an empty object when the stored value is corrupted", () => {
    window.localStorage.setItem("faqchatbot:widget-session:acme", "not-json");

    expect(loadStoredSessionIds("acme")).toEqual({});
  });
});
