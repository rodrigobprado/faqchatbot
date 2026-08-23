import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { PlansController } from "./plans.controller.js";
import { PlansService } from "./plans.service.js";

@Module({
  imports: [JwtModule.register({})],
  controllers: [PlansController],
  providers: [PlansService, JwtAuthGuard, PermissionsGuard]
})
export class PlansModule {}
