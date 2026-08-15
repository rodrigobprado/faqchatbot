import { Module } from "@nestjs/common";
import { AgentRouterModule } from "../agent-router/agent-router.module.js";
import { AgentRouterService } from "../agent-router/agent-router.service.js";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createMessagesRepository } from "../../db/repositories/messages.repository.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";
import { WidgetAuthGuard } from "./widget-auth.guard.js";

@Module({
  imports: [DatabaseModule, AgentRouterModule],
  controllers: [ChatController],
  providers: [
    WidgetAuthGuard,
    {
      provide: ChatService,
      inject: [DatabaseService, AgentRouterService],
      useFactory: (databaseService: DatabaseService, agentRouter: AgentRouterService) => {
        const { db } = databaseService;

        return new ChatService({
          conversations: createConversationsRepository(db),
          agentRouter,
          messages: createMessagesRepository(db),
          analyticsEvents: createAnalyticsEventsRepository(db)
        });
      }
    }
  ]
})
export class ChatModule {}
