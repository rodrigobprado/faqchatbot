import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AgentRouterModule } from "../agent-router/agent-router.module.js";
import { WidgetJwtGuard } from "../auth/guards/widget-jwt.guard.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { ChatStreamBroker } from "./chat-stream.broker.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  imports: [JwtModule.register({}), AgentRouterModule, RateLimitModule],
  controllers: [ChatController],
  providers: [ChatService, ChatStreamBroker, WidgetJwtGuard]
})
export class ChatModule {}
