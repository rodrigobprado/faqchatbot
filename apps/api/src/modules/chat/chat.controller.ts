import { Body, Controller, Get, Inject, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { WidgetAuthGuard, type WidgetRequest } from "./widget-auth.guard.js";
import { ChatService } from "./chat.service.js";

@ApiTags("chat")
@UseGuards(WidgetAuthGuard)
@Controller("v1/chat")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post("messages")
  @ApiOkResponse({ description: "Persists a chat message and returns the exchange" })
  send(@Req() request: WidgetRequest, @Body() body: unknown) {
    return this.chatService.sendMessage(request.widgetUser!, body);
  }

  @Get("history/:conversationId")
  @ApiOkResponse({ description: "Returns the conversation history" })
  history(@Req() request: WidgetRequest, @Param("conversationId") conversationId: string) {
    return this.chatService.getHistory(request.widgetUser!, conversationId);
  }

  @Get("stream/:conversationId")
  @ApiOkResponse({ description: "Streams the conversation history as SSE" })
  async stream(
    @Req() request: WidgetRequest,
    @Param("conversationId") conversationId: string,
    @Res() reply: FastifyReply,
  ) {
    const payload = await this.chatService.buildStream(request.widgetUser!, conversationId);

    reply.raw.statusCode = 200;
    reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.end(payload);
  }
}
