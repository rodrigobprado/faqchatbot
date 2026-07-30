import { z } from "zod";
import { agentProviderSchema } from "./tenants.js";

const baseEventSchema = z.object({
  tenantId: z.string().uuid().optional(),
  occurredAt: z.string().datetime()
});

export const widgetSessionStartedEventSchema = baseEventSchema.extend({
  type: z.literal("WidgetSessionStarted"),
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  conversationId: z.string().uuid()
});

export const conversationStartedEventSchema = baseEventSchema.extend({
  type: z.literal("ConversationStarted"),
  conversationId: z.string().uuid(),
  sessionId: z.string().uuid()
});

export const messageReceivedEventSchema = baseEventSchema.extend({
  type: z.literal("MessageReceived"),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid()
});

export const agentRoutingStartedEventSchema = baseEventSchema.extend({
  type: z.literal("AgentRoutingStarted"),
  conversationId: z.string().uuid(),
  provider: agentProviderSchema
});

export const agentRoutingFailedEventSchema = baseEventSchema.extend({
  type: z.literal("AgentRoutingFailed"),
  conversationId: z.string().uuid(),
  provider: agentProviderSchema,
  reason: z.string().max(500)
});

export const assistantMessageStreamedEventSchema = baseEventSchema.extend({
  type: z.literal("AssistantMessageStreamed"),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid()
});

export const conversationEndedEventSchema = baseEventSchema.extend({
  type: z.literal("ConversationEnded"),
  conversationId: z.string().uuid(),
  reason: z.string().max(200).optional()
});

export const buttonClickedEventSchema = baseEventSchema.extend({
  type: z.literal("ButtonClicked"),
  conversationId: z.string().uuid(),
  buttonId: z.string().min(1).max(80)
});

export const leadIdentifiedEventSchema = baseEventSchema.extend({
  type: z.literal("LeadIdentified"),
  conversationId: z.string().uuid(),
  visitorId: z.string().uuid()
});

export const rateLimitExceededEventSchema = baseEventSchema.extend({
  type: z.literal("RateLimitExceeded"),
  scope: z.enum(["ip", "tenant", "api_key", "visitor", "conversation"])
});

export const adminConfigChangedEventSchema = baseEventSchema.extend({
  type: z.literal("AdminConfigChanged"),
  actorUserId: z.string().uuid(),
  changedFields: z.array(z.string().min(1).max(120)).min(1)
});

export const internalEventSchema = z.discriminatedUnion("type", [
  widgetSessionStartedEventSchema,
  conversationStartedEventSchema,
  messageReceivedEventSchema,
  agentRoutingStartedEventSchema,
  agentRoutingFailedEventSchema,
  assistantMessageStreamedEventSchema,
  conversationEndedEventSchema,
  buttonClickedEventSchema,
  leadIdentifiedEventSchema,
  rateLimitExceededEventSchema,
  adminConfigChangedEventSchema
]);

export type InternalEvent = z.infer<typeof internalEventSchema>;
