import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { PermissionsController } from "./permissions.controller.js";
import { SystemLogsController } from "./system-logs.controller.js";
import { TenantsController } from "./tenants.controller.js";
import { TenantsService } from "./tenants.service.js";

@Module({
  imports: [JwtModule.register({})],
  controllers: [TenantsController, PermissionsController, SystemLogsController],
  providers: [TenantsService, JwtAuthGuard, PermissionsGuard]
})
export class TenantsModule {}
