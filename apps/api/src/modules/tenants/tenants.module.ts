import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { TenantsController } from "./tenants.controller.js";
import { TenantsService } from "./tenants.service.js";

@Module({
  imports: [JwtModule.register({})],
  controllers: [TenantsController],
  providers: [TenantsService, JwtAuthGuard, PermissionsGuard]
})
export class TenantsModule {}
