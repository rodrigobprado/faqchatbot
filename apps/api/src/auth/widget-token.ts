import { createHmac } from "node:crypto";

export type WidgetAccessTokenPayload = Readonly<{
  scope: "widget";
  tenantId: string;
  visitorId: string;
  sessionId: string;
  conversationId: string;
  issuedAt: number;
  expiresAt: number;
}>;

const base64UrlEncode = (value: string): string => Buffer.from(value).toString("base64url");

export const createWidgetAccessToken = (
  payload: WidgetAccessTokenPayload,
  secret: string,
): string => {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
};
