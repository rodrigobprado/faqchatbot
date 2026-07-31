import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
// NestJS's emitDecoratorMetadata needs real (non `import type`) references to
// resolve ValidationPipe/DI metatypes at runtime for these classes.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreatePlanDto, UpdatePlanDto } from "./dto/plans.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PlansService } from "./plans.service.js";

@ApiTags("admin-plans")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/admin/plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @RequirePermissions("plans:write")
  create(@Body() body: CreatePlanDto) {
    return this.plansService.create(body);
  }

  @Get()
  @RequirePermissions("plans:read")
  list() {
    return this.plansService.list();
  }

  @Get(":id")
  @RequirePermissions("plans:read")
  get(@Param("id") id: string) {
    return this.plansService.get(id);
  }

  @Patch(":id")
  @RequirePermissions("plans:write")
  update(@Param("id") id: string, @Body() body: UpdatePlanDto) {
    return this.plansService.update(id, body);
  }
}
