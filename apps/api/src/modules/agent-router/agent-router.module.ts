import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { AgentRouterService } from "./agent-router.service.js";

@Module({
  imports: [AnalyticsModule],
  providers: [AgentRouterService],
  exports: [AgentRouterService]
})
export class AgentRouterModule {}
