import { z } from "zod";
import { agentProviderSchema } from "./tenants.js";

const baseEventSchema = z.object({
  tenantId: z.uuid().optional(),
  occurredAt: z.iso.datetime()
});

export const widgetSessionStartedEventSchema = baseEventSchema.extend({
  type: z.literal("WidgetSessionStarted"),
  visitorId: z.uuid(),
  sessionId: z.uuid(),
  conversationId: z.uuid(),
  origin: z.string().max(255).optional(),
  pageUrl: z.string().max(2048).optional(),
  device: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional()
});

export const conversationStartedEventSchema = baseEventSchema.extend({
  type: z.literal("ConversationStarted"),
  conversationId: z.uuid(),
  sessionId: z.uuid()
});

export const messageReceivedEventSchema = baseEventSchema.extend({
  type: z.literal("MessageReceived"),
  conversationId: z.uuid(),
  messageId: z.uuid()
});

export const agentRoutingStartedEventSchema = baseEventSchema.extend({
  type: z.literal("AgentRoutingStarted"),
  conversationId: z.uuid(),
  provider: agentProviderSchema
});

export const agentRoutingCompletedEventSchema = baseEventSchema.extend({
  type: z.literal("AgentRoutingCompleted"),
  conversationId: z.uuid(),
  provider: agentProviderSchema,
  durationMs: z.number().int().nonnegative()
});

export const agentRoutingFailedEventSchema = baseEventSchema.extend({
  type: z.literal("AgentRoutingFailed"),
  conversationId: z.uuid(),
  provider: agentProviderSchema,
  reason: z.string().max(500),
  durationMs: z.number().int().nonnegative().optional()
});

export const assistantMessageStreamedEventSchema = baseEventSchema.extend({
  type: z.literal("AssistantMessageStreamed"),
  conversationId: z.uuid(),
  messageId: z.uuid()
});

export const conversationEndedEventSchema = baseEventSchema.extend({
  type: z.literal("ConversationEnded"),
  conversationId: z.uuid(),
  reason: z.enum(["resolved", "abandoned"]).optional(),
  durationMs: z.number().int().nonnegative().optional()
});

export const buttonClickedEventSchema = baseEventSchema.extend({
  type: z.literal("ButtonClicked"),
  conversationId: z.uuid(),
  buttonId: z.string().min(1).max(80)
});

export const leadIdentifiedEventSchema = baseEventSchema.extend({
  type: z.literal("LeadIdentified"),
  conversationId: z.uuid(),
  visitorId: z.uuid()
});

export const rateLimitExceededEventSchema = baseEventSchema.extend({
  type: z.literal("RateLimitExceeded"),
  scope: z.enum(["ip", "tenant", "api_key", "visitor", "conversation"])
});

export const adminConfigChangedEventSchema = baseEventSchema.extend({
  type: z.literal("AdminConfigChanged"),
  actorUserId: z.uuid(),
  changedFields: z.array(z.string().min(1).max(120)).min(1)
});

export const internalEventSchema = z.discriminatedUnion("type", [
  widgetSessionStartedEventSchema,
  conversationStartedEventSchema,
  messageReceivedEventSchema,
  agentRoutingStartedEventSchema,
  agentRoutingCompletedEventSchema,
  agentRoutingFailedEventSchema,
  assistantMessageStreamedEventSchema,
  conversationEndedEventSchema,
  buttonClickedEventSchema,
  leadIdentifiedEventSchema,
  rateLimitExceededEventSchema,
  adminConfigChangedEventSchema
]);

export type InternalEvent = z.infer<typeof internalEventSchema>;
