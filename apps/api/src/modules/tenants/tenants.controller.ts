import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
// NestJS's emitDecoratorMetadata needs real (non `import type`) references to
// resolve ValidationPipe/DI metatypes at runtime for these classes.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  AnalyticsQueryDto,
  CreateTenantDomainDto,
  CreateTenantDto,
  RateLimitPolicyDto,
  TenantAgentConfigDto,
  TenantConfigDto,
  UpdateTenantDto
} from "./dto/tenants.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TenantsService } from "./tenants.service.js";

@ApiTags("admin-tenants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/admin/tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions("tenants:write")
  create(@Body() body: CreateTenantDto) {
    return this.tenantsService.create(body);
  }

  @Get()
  @RequirePermissions("tenants:read")
  list() {
    return this.tenantsService.list();
  }

  @Get(":id")
  @RequirePermissions("tenants:read")
  get(@Param("id") id: string) {
    return this.tenantsService.get(id);
  }

  @Patch(":id")
  @RequirePermissions("tenants:write")
  update(@Param("id") id: string, @Body() body: UpdateTenantDto) {
    return this.tenantsService.update(id, body);
  }

  @Delete(":id")
  @RequirePermissions("tenants:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.tenantsService.remove(id);
  }

  @Post(":id/domains")
  @RequirePermissions("tenants:write")
  addDomain(@Param("id") id: string, @Body() body: CreateTenantDomainDto) {
    return this.tenantsService.addDomain(id, body);
  }

  @Get(":id/domains")
  @RequirePermissions("tenants:read")
  listDomains(@Param("id") id: string) {
    return this.tenantsService.listDomains(id);
  }

  @Delete(":id/domains/:domainId")
  @RequirePermissions("tenants:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDomain(@Param("id") id: string, @Param("domainId") domainId: string) {
    return this.tenantsService.removeDomain(id, domainId);
  }

  @Put(":id/config")
  @RequirePermissions("tenants:write")
  upsertConfig(@Param("id") id: string, @Body() body: TenantConfigDto) {
    return this.tenantsService.upsertConfig(id, body);
  }

  @Get(":id/config")
  @RequirePermissions("tenants:read")
  getConfig(@Param("id") id: string) {
    return this.tenantsService.getConfig(id);
  }

  @Put(":id/agent-config")
  @RequirePermissions("tenants:write")
  upsertAgentConfig(@Param("id") id: string, @Body() body: TenantAgentConfigDto) {
    return this.tenantsService.upsertAgentConfig(id, body);
  }

  @Get(":id/agent-config")
  @RequirePermissions("tenants:read")
  getAgentConfig(@Param("id") id: string) {
    return this.tenantsService.getAgentConfig(id);
  }

  @Get(":id/rate-limits")
  @RequirePermissions("tenants:read")
  getRateLimits(@Param("id") id: string) {
    return this.tenantsService.getRateLimits(id);
  }

  @Put(":id/rate-limits")
  @RequirePermissions("tenants:write")
  upsertRateLimit(@Param("id") id: string, @Body() body: RateLimitPolicyDto) {
    return this.tenantsService.upsertRateLimit(id, body);
  }

  @Get(":id/analytics")
  @RequirePermissions("tenants:read")
  getAnalytics(@Param("id") id: string, @Query() query: AnalyticsQueryDto) {
    return this.tenantsService.getAnalytics(id, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined
    });
  }
}
