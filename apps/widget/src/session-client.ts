import type { WidgetSessionStartRequest, WidgetSessionStartResponse } from "@faqchatbot/contracts";
import { unwrapEnvelope } from "./api-response.js";

export const startWidgetSession = async (
  apiUrl: string,
  request: WidgetSessionStartRequest,
): Promise<WidgetSessionStartResponse> => {
  const response = await fetch(`${apiUrl}/v1/widget/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to start widget session (status ${response.status})`);
  }

  return unwrapEnvelope<WidgetSessionStartResponse>(await response.json());
};
