import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { WidgetSessionController } from "./widget-session.controller.js";
import { WidgetSessionService } from "./widget-session.service.js";

const widgetTokenSecret = () => {
  const secret = process.env.JWT_WIDGET_SECRET;
  if (secret && secret.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_WIDGET_SECRET is required in production");
  }

  return "dev-widget-secret-dev-widget-secret";
};

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
          widgetTokenSecret: widgetTokenSecret(),
          widgetTokenTtlSeconds: 900
        });
      }
    }
  ]
})
export class WidgetSessionModule {}
