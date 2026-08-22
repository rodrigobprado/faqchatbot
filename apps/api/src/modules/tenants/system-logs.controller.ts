import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { PaginationQueryDto } from "./dto/tenants.dto.js";
// NestJS's emitDecoratorMetadata needs a real reference to resolve DI metatype.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TenantsService } from "./tenants.service.js";

export class SystemLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsIn(["debug", "info", "warn", "error"])
  level?: "debug" | "info" | "warn" | "error";
}

@ApiTags("admin-logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/admin/logs")
export class SystemLogsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions("tenants:read")
  list(@Query() query: SystemLogsQueryDto) {
    return this.tenantsService.listSystemLogs({
      tenantId: query.tenantId,
      level: query.level,
      limit: query.limit,
      offset: query.offset
    });
  }
}
