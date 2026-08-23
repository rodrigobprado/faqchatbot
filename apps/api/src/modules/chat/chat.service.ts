import type { ChatMessage, MessageContent } from "@faqchatbot/contracts";
import { messageContentSchema } from "@faqchatbot/contracts";
import { BadRequestException, ForbiddenException, Inject, Injectable, type MessageEvent } from "@nestjs/common";
import type { Observable } from "rxjs";
import type { Database } from "../../db/client.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createMessagesRepository } from "../../db/repositories/messages.repository.js";
import type { messages } from "../../db/schema.js";
import type { WidgetTokenClaims } from "../auth/access-token-claims.js";
import { DATABASE } from "../core/core.module.js";
// NestJS resolves these constructor-injected classes via emitDecoratorMetadata,
// which needs a real (non `import type`) reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AgentRouterService } from "../agent-router/agent-router.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AnalyticsService } from "../analytics/analytics.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ChatStreamBroker } from "./chat-stream.broker.js";
import { sanitizeMessageContent } from "./markdown-sanitizer.js";

const TOKEN_DELAY_MS = 15;
const GENERIC_ASSISTANT_ERROR = "Nao foi possivel obter uma resposta no momento.";

type MessageRow = typeof messages.$inferSelect;

export type SendMessageInput = {
  conversationId: string;
  content: unknown;
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const toChatMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  conversationId: row.conversationId,
  tenantId: row.tenantId,
  role: row.role,
  createdAt: row.createdAt.toISOString(),
  metadata: row.metadata as Record<string, unknown>,
  content: row.content as MessageContent
});

@Injectable()
export class ChatService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly broker: ChatStreamBroker,
    private readonly agentRouter: AgentRouterService,
    private readonly rateLimit: RateLimitService,
    private readonly analytics: AnalyticsService,
  ) {}

  async sendMessage(claims: WidgetTokenClaims, input: SendMessageInput): Promise<ChatMessage> {
    this.assertOwnsConversation(claims, input.conversationId);

    await this.rateLimit.enforce("visitor", claims.sub, claims.tenantId);
    await this.rateLimit.enforce("conversation", claims.conversationId, claims.tenantId);

    const parsed = messageContentSchema.safeParse(input.content);
    if (!parsed.success) {
      throw new BadRequestException("Invalid message content");
    }

    const sanitizedContent = sanitizeMessageContent(parsed.data);
    const messagesRepository = createMessagesRepository(this.db);
    const userMessage = await messagesRepository.create({
      tenantId: claims.tenantId,
      conversationId: claims.conversationId,
      role: "user",
      type: sanitizedContent.type,
      content: sanitizedContent
    });

    void this.streamAssistantReply(claims, sanitizedContent);

    return toChatMessage(userMessage);
  }

  async getHistory(claims: WidgetTokenClaims, conversationId: string): Promise<ChatMessage[]> {
    this.assertOwnsConversation(claims, conversationId);

    const rows = await createMessagesRepository(this.db).listByConversationId(conversationId);
    return rows.map(toChatMessage);
  }

  stream(claims: WidgetTokenClaims, conversationId: string): Observable<MessageEvent> {
    this.assertOwnsConversation(claims, conversationId);

    return this.broker.stream(conversationId);
  }

  recordButtonClick(claims: WidgetTokenClaims, input: { conversationId: string; buttonId: string }): void {
    this.assertOwnsConversation(claims, input.conversationId);

    this.analytics.record({
      type: "ButtonClicked",
      tenantId: claims.tenantId,
      occurredAt: new Date().toISOString(),
      conversationId: claims.conversationId,
      buttonId: input.buttonId
    });
  }

  async endConversation(
    claims: WidgetTokenClaims,
    conversationId: string,
    input: { reason?: "resolved" | "abandoned" },
  ): Promise<void> {
    this.assertOwnsConversation(claims, conversationId);

    const endedAt = new Date();
    const conversation = await createConversationsRepository(this.db).close(conversationId, endedAt);

    this.analytics.record({
      type: "ConversationEnded",
      tenantId: claims.tenantId,
      occurredAt: endedAt.toISOString(),
      conversationId,
      reason: input.reason,
      durationMs: endedAt.getTime() - conversation.startedAt.getTime()
    });
  }

  private assertOwnsConversation(claims: WidgetTokenClaims, conversationId: string): void {
    if (claims.conversationId !== conversationId) {
      throw new ForbiddenException("Token does not grant access to this conversation");
    }
  }

  private async streamAssistantReply(claims: WidgetTokenClaims, userContent: MessageContent): Promise<void> {
    const { tenantId, conversationId } = claims;
    this.broker.emit(conversationId, { type: "typing" });

    let replyContent: MessageContent;
    try {
      const response = await this.agentRouter.route({
        tenantId,
        conversationId,
        visitorId: claims.sub,
        message: userContent
      });
      replyContent = response.content;
    } catch {
      this.broker.emit(conversationId, { type: "error", message: GENERIC_ASSISTANT_ERROR });
      return;
    }

    if (replyContent.type === "text" || replyContent.type === "markdown") {
      const text = replyContent.type === "text" ? replyContent.text : replyContent.markdown;
      for (const token of text.split(" ")) {
        await delay(TOKEN_DELAY_MS);
        this.broker.emit(conversationId, { type: "token", token });
      }
    }

    const sanitizedReply = sanitizeMessageContent(replyContent);
    const assistantMessage = await createMessagesRepository(this.db).create({
      tenantId,
      conversationId,
      role: "assistant",
      type: sanitizedReply.type,
      content: sanitizedReply
    });

    this.broker.emit(conversationId, { type: "message", message: toChatMessage(assistantMessage) });
  }
}
