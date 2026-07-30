import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const tenantIdColumn = () => uuid("tenant_id").notNull();

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "inactive", "suspended"]);
export const agentProviderEnum = pgEnum("agent_provider", [
  "n8n",
  "openai_responses",
  "langgraph",
  "flowise",
  "dify",
  "crewai",
  "mcp",
  "custom"
]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "closed"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const rateLimitScopeEnum = pgEnum("rate_limit_scope", [
  "ip",
  "tenant",
  "api_key",
  "visitor",
  "conversation"
]);
export const systemLogLevelEnum = pgEnum("system_log_level", [
  "debug",
  "info",
  "warn",
  "error"
]);

export const plans = pgTable("plans", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  limits: jsonb("limits").notNull().default({}),
  priceCents: integer("price_cents").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const tenants = pgTable(
  "tenants",
  {
    id: id(),
    publicId: varchar("public_id", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    status: tenantStatusEnum("status").notNull().default("active"),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    defaultLocale: varchar("default_locale", { length: 20 }).notNull().default("pt-BR"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [index("tenants_public_id_idx").on(table.publicId)],
);

export const tenantDomains = pgTable(
  "tenant_domains",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    domain: varchar("domain", { length: 255 }).notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: createdAt()
  },
  (table) => [
    index("tenant_domains_tenant_id_idx").on(table.tenantId),
    index("tenant_domains_domain_idx").on(table.domain)
  ],
);

export const tenantConfigs = pgTable(
  "tenant_configs",
  {
    id: id(),
    tenantId: tenantIdColumn()
      .references(() => tenants.id)
      .unique(),
    theme: varchar("theme", { length: 20 }).notNull().default("auto"),
    primaryColor: varchar("primary_color", { length: 20 }).notNull().default("#2563eb"),
    iconUrl: text("icon_url"),
    initialMessage: varchar("initial_message", { length: 500 }).notNull().default(""),
    placeholder: varchar("placeholder", { length: 120 }).notNull().default(""),
    updatedAt: updatedAt()
  },
  (table) => [index("tenant_configs_tenant_id_idx").on(table.tenantId)],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    url: text("url").notNull(),
    secretRef: varchar("secret_ref", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt()
  },
  (table) => [index("webhook_endpoints_tenant_id_idx").on(table.tenantId)],
);

export const tenantAgentConfigs = pgTable(
  "tenant_agent_configs",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    provider: agentProviderEnum("provider").notNull(),
    model: varchar("model", { length: 120 }),
    webhookEndpointId: uuid("webhook_endpoint_id").references(() => webhookEndpoints.id),
    encryptedCredentialsRef: varchar("encrypted_credentials_ref", { length: 255 }),
    routingRules: jsonb("routing_rules").notNull().default({}),
    timeoutMs: integer("timeout_ms").notNull().default(15000),
    retryPolicy: jsonb("retry_policy").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [index("tenant_agent_configs_tenant_id_idx").on(table.tenantId)],
);

export const roles = pgTable(
  "roles",
  {
    id: id(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: createdAt()
  },
  (table) => [index("roles_tenant_id_idx").on(table.tenantId)],
);

export const permissions = pgTable("permissions", {
  id: id(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description")
});

export const users = pgTable(
  "users",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    index("users_tenant_id_idx").on(table.tenantId),
    index("users_email_idx").on(table.email)
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    createdAt: createdAt()
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    name: varchar("name", { length: 120 }).notNull(),
    hashedKey: varchar("hashed_key", { length: 255 }).notNull(),
    prefix: varchar("prefix", { length: 20 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [index("api_keys_tenant_id_idx").on(table.tenantId)],
);

export const visitorSessions = pgTable(
  "visitor_sessions",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    visitorId: uuid("visitor_id").notNull(),
    startedAt: createdAt(),
    lastSeenAt: updatedAt(),
    pageContext: jsonb("page_context").notNull().default({})
  },
  (table) => [
    index("visitor_sessions_tenant_id_idx").on(table.tenantId),
    index("visitor_sessions_visitor_id_idx").on(table.visitorId)
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => visitorSessions.id),
    status: conversationStatusEnum("status").notNull().default("open"),
    startedAt: createdAt(),
    endedAt: timestamp("ended_at", { withTimezone: true })
  },
  (table) => [
    index("conversations_tenant_id_idx").on(table.tenantId),
    index("conversations_session_id_idx").on(table.sessionId)
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    role: messageRoleEnum("role").notNull(),
    type: varchar("type", { length: 40 }).notNull(),
    content: jsonb("content").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    createdAt: createdAt()
  },
  (table) => [
    index("messages_tenant_id_idx").on(table.tenantId),
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_created_at_idx").on(table.createdAt)
  ],
);

export const messageEvents = pgTable(
  "message_events",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: createdAt()
  },
  (table) => [
    index("message_events_tenant_id_idx").on(table.tenantId),
    index("message_events_message_id_idx").on(table.messageId)
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: createdAt()
  },
  (table) => [
    index("analytics_events_tenant_id_idx").on(table.tenantId),
    index("analytics_events_conversation_id_idx").on(table.conversationId),
    index("analytics_events_created_at_idx").on(table.createdAt)
  ],
);

export const rateLimitPolicies = pgTable(
  "rate_limit_policies",
  {
    id: id(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    scope: rateLimitScopeEnum("scope").notNull(),
    limit: integer("limit").notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    createdAt: createdAt()
  },
  (table) => [index("rate_limit_policies_tenant_id_idx").on(table.tenantId)],
);

export const rateLimitCounters = pgTable(
  "rate_limit_counters",
  {
    id: id(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    scope: rateLimitScopeEnum("scope").notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    count: integer("count").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull()
  },
  (table) => [
    index("rate_limit_counters_tenant_id_idx").on(table.tenantId),
    index("rate_limit_counters_key_idx").on(table.key)
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAt()
  },
  (table) => [
    index("audit_logs_tenant_id_idx").on(table.tenantId),
    index("audit_logs_created_at_idx").on(table.createdAt)
  ],
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: id(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    level: systemLogLevelEnum("level").notNull(),
    message: text("message").notNull(),
    context: jsonb("context").notNull().default({}),
    createdAt: createdAt()
  },
  (table) => [
    index("system_logs_tenant_id_idx").on(table.tenantId),
    index("system_logs_created_at_idx").on(table.createdAt)
  ],
);

export const storedFiles = pgTable(
  "stored_files",
  {
    id: id(),
    tenantId: tenantIdColumn().references(() => tenants.id),
    bucket: varchar("bucket", { length: 120 }).notNull(),
    objectKey: varchar("object_key", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    createdAt: createdAt()
  },
  (table) => [index("stored_files_tenant_id_idx").on(table.tenantId)],
);
