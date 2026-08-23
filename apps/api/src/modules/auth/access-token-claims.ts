export type AccessTokenClaims = {
  sub: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  scope: "admin";
};

export type WidgetTokenClaims = {
  sub: string;
  tenantId: string;
  sessionId: string;
  conversationId: string;
  scope: "widget";
};
