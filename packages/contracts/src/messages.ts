import { z } from "zod";

const httpUrlSchema = z
  .string()
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, {
    message: "URL must use http or https"
  });

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export const baseMessageSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  role: messageRoleSchema,
  createdAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const textMessageContentSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(16000)
});

export const markdownMessageContentSchema = z.object({
  type: z.literal("markdown"),
  markdown: z.string().min(1).max(16000)
});

export const mediaMessageContentSchema = z.object({
  type: z.enum(["image", "video", "audio", "file"]),
  url: httpUrlSchema,
  title: z.string().max(120).optional(),
  mimeType: z.string().max(120).optional(),
  sizeBytes: z.number().int().nonnegative().optional()
});

export const buttonSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  value: z.string().max(500).optional(),
  url: httpUrlSchema.optional()
});

export const cardMessageContentSchema = z.object({
  type: z.literal("card"),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  imageUrl: httpUrlSchema.optional(),
  buttons: z.array(buttonSchema).max(6).default([])
});

export const carouselMessageContentSchema = z.object({
  type: z.literal("carousel"),
  items: z.array(cardMessageContentSchema.omit({ type: true })).min(1).max(10)
});

export const quickRepliesMessageContentSchema = z.object({
  type: z.literal("quick_replies"),
  text: z.string().min(1).max(500),
  replies: z.array(buttonSchema).min(1).max(12)
});

export const tableMessageContentSchema = z.object({
  type: z.literal("table"),
  columns: z.array(z.string().min(1).max(80)).min(1).max(12),
  rows: z.array(z.array(z.string().max(500))).max(50)
});

export const formFieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  inputType: z.enum(["text", "email", "tel", "number", "date", "textarea"]),
  required: z.boolean().default(false)
});

export const formMessageContentSchema = z.object({
  type: z.literal("form"),
  title: z.string().min(1).max(120),
  fields: z.array(formFieldSchema).min(1).max(20),
  submitLabel: z.string().min(1).max(80).default("Enviar")
});

export const locationMessageContentSchema = z.object({
  type: z.literal("location"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(120).optional()
});

export const statusMessageContentSchema = z.object({
  type: z.enum(["typing", "error", "system"]),
  text: z.string().max(1000).optional(),
  code: z.string().max(80).optional()
});

export const calendarMessageContentSchema = z.object({
  type: z.literal("calendar"),
  title: z.string().min(1).max(120),
  availableSlots: z.array(z.string().datetime()).min(1).max(50)
});

export const messageContentSchema = z.discriminatedUnion("type", [
  textMessageContentSchema,
  markdownMessageContentSchema,
  mediaMessageContentSchema,
  cardMessageContentSchema,
  carouselMessageContentSchema,
  quickRepliesMessageContentSchema,
  tableMessageContentSchema,
  formMessageContentSchema,
  locationMessageContentSchema,
  statusMessageContentSchema,
  calendarMessageContentSchema
]);

export const chatMessageSchema = baseMessageSchema.extend({
  content: messageContentSchema
});

export const chatMessageCreateRequestSchema = z.object({
  content: messageContentSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const chatMessageExchangeResponseSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: chatMessageSchema,
  assistantMessage: chatMessageSchema
});

export const chatMessageHistoryResponseSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(chatMessageSchema)
});

export type MessageRole = z.infer<typeof messageRoleSchema>;
export type MessageContent = z.infer<typeof messageContentSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatMessageCreateRequest = z.infer<typeof chatMessageCreateRequestSchema>;
export type ChatMessageExchangeResponse = z.infer<typeof chatMessageExchangeResponseSchema>;
export type ChatMessageHistoryResponse = z.infer<typeof chatMessageHistoryResponseSchema>;
