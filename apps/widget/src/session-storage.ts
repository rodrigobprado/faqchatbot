export type StoredSessionIds = {
  visitorId?: string;
  sessionId?: string;
  conversationId?: string;
};

const storageKey = (agentId: string) => `faqchatbot:widget-session:${agentId}`;

export const loadStoredSessionIds = (agentId: string): StoredSessionIds => {
  const raw = window.localStorage.getItem(storageKey(agentId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StoredSessionIds;
  } catch {
    return {};
  }
};

export const saveStoredSessionIds = (agentId: string, ids: StoredSessionIds): void => {
  window.localStorage.setItem(storageKey(agentId), JSON.stringify(ids));
};
