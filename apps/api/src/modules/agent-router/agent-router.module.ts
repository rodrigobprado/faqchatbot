import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { AgentRouterService } from "./agent-router.service.js";
import { N8nAgentAdapter } from "./n8n-agent.adapter.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AgentRouterService,
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => {
        const { db } = databaseService;
        const n8nAdapter = new N8nAgentAdapter();

        return new AgentRouterService({
          tenantAgentConfigs: createTenantAgentConfigsRepository(db),
          adapters: {
            n8n: n8nAdapter,
            openai_responses: n8nAdapter,
            langgraph: n8nAdapter,
            flowise: n8nAdapter,
            dify: n8nAdapter,
            crewai: n8nAdapter,
            mcp: n8nAdapter,
            custom: n8nAdapter
          },
          fallbackProvider: "n8n"
        });
      }
    }
  ],
  exports: [AgentRouterService]
})
export class AgentRouterModule {}
