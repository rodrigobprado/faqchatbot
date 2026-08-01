import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { WidgetAccessTokenPayload } from "../../auth/widget-token.js";
import type { AgentRouterService } from "../agent-router/agent-router.service.js";

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

const messageRoleSchema = z.enum(["user", "assistant", "system"]);

const baseMessageSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  role: messageRoleSchema,
  createdAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const textMessageContentSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(16000)
});

const markdownMessageContentSchema = z.object({
  type: z.literal("markdown"),
  markdown: z.string().min(1).max(16000)
});

const mediaMessageContentSchema = z.object({
  type: z.enum(["image", "video", "audio", "file"]),
  url: httpUrlSchema,
  title: z.string().max(120).optional(),
  mimeType: z.string().max(120).optional(),
  sizeBytes: z.number().int().nonnegative().optional()
});

const buttonSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  value: z.string().max(500).optional(),
  url: httpUrlSchema.optional()
});

const cardMessageContentSchema = z.object({
  type: z.literal("card"),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  imageUrl: httpUrlSchema.optional(),
  buttons: z.array(buttonSchema).max(6).default([])
});

const chatMessageContentSchema = z.discriminatedUnion("type", [
  textMessageContentSchema,
  markdownMessageContentSchema,
  mediaMessageContentSchema,
  cardMessageContentSchema
]);

const chatMessageCreateRequestSchema = z.object({
  content: chatMessageContentSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

const chatMessageSchema = baseMessageSchema.extend({
  content: chatMessageContentSchema
});

const chatMessageExchangeResponseSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: chatMessageSchema,
  assistantMessage: chatMessageSchema
});

const chatMessageHistoryResponseSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(chatMessageSchema)
});

type ChatMessage = z.infer<typeof chatMessageSchema>;
type ChatMessageCreateRequest = z.infer<typeof chatMessageCreateRequestSchema>;

type ConversationRecord = Readonly<{
  id: string;
  tenantId: string;
  sessionId: string;
  status: "open" | "closed";
}>;

type MessageRecord = Readonly<{
  id: string;
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: unknown;
  metadata: Record<string, unknown> | null;
  providerMessageId: string | null;
  createdAt: Date;
}>;

export type ChatServiceDependencies = Readonly<{
  conversations: {
    findById(id: string): Promise<ConversationRecord | null>;
  };
  agentRouter: AgentRouterService;
  messages: {
    create(input: {
      id?: string;
      tenantId: string;
      conversationId: string;
      role: "user" | "assistant" | "system";
      type: string;
      content: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      providerMessageId?: string | null;
    }): Promise<MessageRecord>;
    listByConversationId(conversationId: string): Promise<MessageRecord[]>;
  };
}>;

export class ChatService {
  constructor(private readonly dependencies: ChatServiceDependencies) {}

  async sendMessage(actor: WidgetAccessTokenPayload, rawInput: unknown) {
    const input = this.parseCreateInput(rawInput);
    const conversation = await this.loadConversation(actor, actor.conversationId);
    const userMessage = await this.dependencies.messages.create({
      tenantId: actor.tenantId,
      conversationId: conversation.id,
      role: "user",
      type: input.content.type,
      content: input.content,
      metadata: input.metadata
    });
    const assistantRoute = await this.dependencies.agentRouter.route({
      tenantId: actor.tenantId,
      conversationId: conversation.id,
      message: input.content
    });
    const assistantMessage = await this.dependencies.messages.create({
      tenantId: actor.tenantId,
      conversationId: conversation.id,
      role: "assistant",
      type: String(assistantRoute.content.type ?? "text"),
      content: assistantRoute.content,
      metadata: {
        replyToMessageId: userMessage.id,
        source: "platform",
        provider: assistantRoute.provider,
        providerMessageId: assistantRoute.providerMessageId,
        ...assistantRoute.metadata
      }
    });

    return chatMessageExchangeResponseSchema.parse({
      conversationId: conversation.id,
      userMessage: this.serializeMessage(userMessage),
      assistantMessage: this.serializeMessage(assistantMessage)
    });
  }

  async getHistory(actor: WidgetAccessTokenPayload, conversationId: string) {
    const conversation = await this.loadConversation(actor, conversationId);
    const messages = await this.dependencies.messages.listByConversationId(conversation.id);

    return chatMessageHistoryResponseSchema.parse({
      conversationId: conversation.id,
      messages: messages.map((message) => this.serializeMessage(message))
    });
  }

  async buildStream(actor: WidgetAccessTokenPayload, conversationId: string) {
    const history = await this.getHistory(actor, conversationId);
    const frames = [
      "retry: 3000\n\n",
      ...history.messages.map((message) => `event: message\ndata: ${JSON.stringify(message)}\n\n`),
      `event: done\ndata: ${JSON.stringify({ conversationId: history.conversationId, total: history.messages.length })}\n\n`
    ];

    return frames.join("");
  }

  private parseCreateInput(rawInput: unknown): ChatMessageCreateRequest {
    try {
      return chatMessageCreateRequestSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid chat message payload");
    }
  }

  private async loadConversation(actor: WidgetAccessTokenPayload, conversationId: string): Promise<ConversationRecord> {
    const conversation = await this.dependencies.conversations.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found`);
    }

    if (conversation.tenantId !== actor.tenantId || conversation.sessionId !== actor.sessionId) {
      throw new ForbiddenException("Conversation access denied");
    }

    if (conversation.status !== "open") {
      throw new ForbiddenException("Conversation is closed");
    }

    return conversation;
  }

  private serializeMessage(message: MessageRecord): ChatMessage {
    return chatMessageSchema.parse({
      ...message,
      createdAt: message.createdAt.toISOString(),
      metadata: message.metadata ?? {},
      content: message.content
    });
  }
}
