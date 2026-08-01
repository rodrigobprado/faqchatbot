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
const base64UrlDecode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

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

export const decodeWidgetAccessToken = (token: string, secret: string): WidgetAccessTokenPayload => {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new Error("Invalid token");
  }

  const unsignedToken = `${header}.${body}`;
  const expectedSignature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  if (signature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }

  return JSON.parse(base64UrlDecode(body)) as WidgetAccessTokenPayload;
};

export const resolveWidgetTokenSecret = () => {
  const secret = process.env.JWT_WIDGET_SECRET;
  if (secret && secret.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_WIDGET_SECRET is required in production");
  }

  return "dev-widget-secret-dev-widget-secret";
};
