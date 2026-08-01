import { createHmac } from "node:crypto";

const base64UrlEncode = (value: string): string => Buffer.from(value).toString("base64url");
const base64UrlDecode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

const signToken = (payload: Record<string, unknown>, secret: string): string => {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
};

const verifyToken = <T extends Record<string, unknown>>(token: string, secret: string): T => {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new Error("Invalid token");
  }

  const unsignedToken = `${header}.${body}`;
  const expectedSignature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  if (signature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }

  return JSON.parse(base64UrlDecode(body)) as T;
};

export type AdminAccessTokenPayload = Readonly<{
  scope: "admin";
  userId: string;
  tenantId: string;
  roles: string[];
  issuedAt: number;
  expiresAt: number;
}>;

export type AdminRefreshTokenPayload = Readonly<{
  scope: "admin_refresh";
  userId: string;
  tenantId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}>;

export const createAdminAccessToken = (payload: AdminAccessTokenPayload, secret: string): string =>
  signToken(payload, secret);

export const createAdminRefreshToken = (payload: AdminRefreshTokenPayload, secret: string): string =>
  signToken(payload, secret);

export const decodeAdminAccessToken = (token: string, secret: string): AdminAccessTokenPayload =>
  verifyToken<AdminAccessTokenPayload>(token, secret);

export const decodeAdminRefreshToken = (token: string, secret: string): AdminRefreshTokenPayload =>
  verifyToken<AdminRefreshTokenPayload>(token, secret);
