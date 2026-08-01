import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createPlansRepository } from "../../db/repositories/plans.repository.js";
import { createTenantAgentConfigsRepository } from "../../db/repositories/tenant-agent-configs.repository.js";
import { createTenantConfigsRepository } from "../../db/repositories/tenant-configs.repository.js";
import { createTenantDomainsRepository } from "../../db/repositories/tenant-domains.repository.js";
import { createTenantsRepository } from "../../db/repositories/tenants.repository.js";
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
          plans: createPlansRepository(db)
        });
      }
    }
  ]
})
export class TenantsModule {}
