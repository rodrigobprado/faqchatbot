import type { ChatMessage } from "@faqchatbot/contracts";
import { unwrapEnvelope } from "./api-response.js";

export type ChatHistoryResponse = Readonly<{ messages: readonly ChatMessage[] }>;

export const sendChatMessage = async (
  apiUrl: string,
  accessToken: string,
  conversationId: string,
  text: string,
): Promise<ChatMessage> => {
  const response = await fetch(`${apiUrl}/v1/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ conversationId, content: { type: "text", text } })
  });

  if (!response.ok) {
    throw new Error(`Failed to send message (status ${response.status})`);
  }

  return unwrapEnvelope<ChatMessage>(await response.json());
};

export const fetchChatHistory = async (
  apiUrl: string,
  accessToken: string,
  conversationId: string,
): Promise<readonly ChatMessage[]> => {
  const response = await fetch(`${apiUrl}/v1/chat/history/${conversationId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to load chat history (status ${response.status})`);
  }

  const payload = unwrapEnvelope<ChatHistoryResponse>(await response.json());
  return payload.messages ?? [];
};
