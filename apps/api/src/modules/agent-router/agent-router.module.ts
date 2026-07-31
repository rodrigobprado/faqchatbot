import { Module } from "@nestjs/common";
import { AgentRouterService } from "./agent-router.service.js";

@Module({
  providers: [AgentRouterService],
  exports: [AgentRouterService]
})
export class AgentRouterModule {}
