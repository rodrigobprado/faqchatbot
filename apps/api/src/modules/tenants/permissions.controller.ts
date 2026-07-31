import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TenantsService } from "./tenants.service.js";

@ApiTags("admin-permissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/admin/permissions")
export class PermissionsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions("tenants:read")
  list() {
    return this.tenantsService.listPermissions();
  }
}
