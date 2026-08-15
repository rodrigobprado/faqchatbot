import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { resolveWidgetTokenSecret } from "../../auth/widget-token.js";
import { WidgetSessionController } from "./widget-session.controller.js";
import { WidgetSessionService } from "./widget-session.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [WidgetSessionController],
  providers: [
    {
      provide: WidgetSessionService,
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => {
        const { db } = databaseService;
        return new WidgetSessionService({
          tenants: createTenantsRepository(db),
          tenantDomains: createTenantDomainsRepository(db),
          visitorSessions: createVisitorSessionsRepository(db),
          conversations: createConversationsRepository(db),
          analyticsEvents: createAnalyticsEventsRepository(db),
          widgetTokenSecret: resolveWidgetTokenSecret(),
          widgetTokenTtlSeconds: 900
        });
      }
    }
  ]
})
export class WidgetSessionModule {}
