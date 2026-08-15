import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createApiKeysRepository } from "../../db/repositories/api-keys.repository.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { createAuditLogsRepository } from "../../db/repositories/audit-logs.repository.js";
import { createConversationsRepository } from "../../db/repositories/conversations.repository.js";
import { createMessagesRepository } from "../../db/repositories/messages.repository.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createTenantConfigsRepository } from "../../db/repositories/tenant-configs.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createSystemLogsRepository } from "../../db/repositories/system-logs.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
import { createRolesRepository } from "../../db/repositories/roles.repository.js";
import { createUserRolesRepository } from "../../db/repositories/user-roles.repository.js";
import { createUsersRepository } from "../../db/repositories/users.repository.js";
import { createVisitorSessionsRepository } from "../../db/repositories/visitor-sessions.repository.js";
import { AdminAuthGuard } from "../auth/admin-auth.guard.js";
import { AdminTenantsController, PublicTenantsController } from "./tenants.controller.js";
import { TenantsService } from "./tenants.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminTenantsController, PublicTenantsController],
  providers: [
    AdminAuthGuard,
    {
      provide: TenantsService,
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => {
        const { db } = databaseService;

        return new TenantsService({
          tenants: createTenantsRepository(db),
          tenantDomains: createTenantDomainsRepository(db),
          tenantConfigs: createTenantConfigsRepository(db),
          tenantAgentConfigs: createTenantAgentConfigsRepository(db),
          users: createUsersRepository(db),
          userRoles: createUserRolesRepository(db),
          roles: createRolesRepository(db),
          apiKeys: createApiKeysRepository(db),
          visitorSessions: createVisitorSessionsRepository(db),
          conversations: createConversationsRepository(db),
          messages: createMessagesRepository(db),
          analyticsEvents: createAnalyticsEventsRepository(db),
          auditLogs: createAuditLogsRepository(db),
          systemLogs: createSystemLogsRepository(db),
          plans: createPlansRepository(db)
        });
      }
    }
  ]
})
export class TenantsModule {}
