import { Module } from "@nestjs/common";
import { createDatabase } from "../../db/client.js";
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
  controllers: [WidgetSessionController],
  providers: [
    {
      provide: WidgetSessionService,
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error("DATABASE_URL is required to initialize widget sessions");
        }

        const { db, client } = createDatabase(databaseUrl);

        return new WidgetSessionService({
          tenants: createTenantsRepository(db),
          tenantDomains: createTenantDomainsRepository(db),
          visitorSessions: createVisitorSessionsRepository(db),
          conversations: createConversationsRepository(db),
          widgetTokenSecret: widgetTokenSecret(),
          widgetTokenTtlSeconds: 900,
          close: async () => {
            await client.end();
          }
        });
      }
    }
  ]
})
export class WidgetSessionModule {}
