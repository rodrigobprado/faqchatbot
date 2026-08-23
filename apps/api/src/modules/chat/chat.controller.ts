import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Sse, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { type AuthenticatedWidgetRequest, WidgetJwtGuard } from "../auth/guards/widget-jwt.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ChatService } from "./chat.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ButtonClickDto } from "./dto/button-click.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EndConversationDto } from "./dto/end-conversation.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SendMessageDto } from "./dto/send-message.dto.js";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(WidgetJwtGuard)
@Controller("v1/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("messages")
  @HttpCode(HttpStatus.CREATED)
  sendMessage(@Req() request: AuthenticatedWidgetRequest, @Body() body: SendMessageDto) {
    return this.chatService.sendMessage(request.user, body);
  }

  @Sse("stream/:conversationId")
  stream(@Req() request: AuthenticatedWidgetRequest, @Param("conversationId") conversationId: string) {
    return this.chatService.stream(request.user, conversationId);
  }

  @Get("history/:conversationId")
  history(@Req() request: AuthenticatedWidgetRequest, @Param("conversationId") conversationId: string) {
    return this.chatService.getHistory(request.user, conversationId);
  }

  @Post("events/button-click")
  @HttpCode(HttpStatus.NO_CONTENT)
  buttonClicked(@Req() request: AuthenticatedWidgetRequest, @Body() body: ButtonClickDto) {
    return this.chatService.recordButtonClick(request.user, body);
  }

  @Post("conversations/:conversationId/end")
  @HttpCode(HttpStatus.NO_CONTENT)
  endConversation(
    @Req() request: AuthenticatedWidgetRequest,
    @Param("conversationId") conversationId: string,
    @Body() body: EndConversationDto,
  ) {
    return this.chatService.endConversation(request.user, conversationId, body);
  }
}
