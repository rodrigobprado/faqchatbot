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
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import type { AccessTokenClaims } from "../auth/access-token-claims.js";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
// NestJS's emitDecoratorMetadata needs real (non `import type`) references to
// resolve ValidationPipe/DI metatypes at runtime for these classes.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  AnalyticsQueryDto,
  CreateRoleDto,
  CreateTenantApiKeyDto,
  CreateTenantDomainDto,
  CreateTenantDto,
  CreateUserDto,
  PaginationQueryDto,
  RateLimitPolicyDto,
  TenantAgentConfigDto,
  TenantConfigDto,
  UpdateTenantDto,
  UpdateTenantUserRolesDto,
  UpdateTenantUserStatusDto
} from "./dto/tenants.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TenantsService } from "./tenants.service.js";

export type AuthenticatedAdminRequest = FastifyRequest & { user: AccessTokenClaims };

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

  @Get("plans")
  @RequirePermissions("tenants:read")
  listPlans() {
    return this.tenantsService.listPlans();
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

  @Get(":id/conversations")
  @RequirePermissions("tenants:read")
  listConversations(@Param("id") id: string, @Query() query: PaginationQueryDto) {
    return this.tenantsService.listConversations(id, query);
  }

  @Get(":id/sessions")
  @RequirePermissions("tenants:read")
  listSessions(@Param("id") id: string, @Query() query: PaginationQueryDto) {
    return this.tenantsService.listSessions(id, query);
  }

  @Get(":id/audit-logs")
  @RequirePermissions("tenants:read")
  listAuditLogs(@Param("id") id: string, @Query() query: PaginationQueryDto) {
    return this.tenantsService.listAuditLogs(id, query);
  }

  @Get(":id/users")
  @RequirePermissions("tenants:read")
  listUsers(@Param("id") id: string) {
    return this.tenantsService.listUsers(id);
  }

  @Post(":id/users")
  @RequirePermissions("tenants:write")
  createUser(@Param("id") id: string, @Body() body: CreateUserDto) {
    return this.tenantsService.createUser(id, body);
  }

  @Get(":id/system-logs")
  @RequirePermissions("tenants:read")
  listSystemLogs(@Param("id") id: string) {
    return this.tenantsService.listTenantSystemLogs(id);
  }

  @Get(":id/conversations/:conversationId")
  @RequirePermissions("tenants:read")
  getConversationDetail(
    @Param("id") id: string,
    @Param("conversationId") conversationId: string,
  ) {
    return this.tenantsService.getConversationDetail(id, conversationId);
  }

  @Get(":id/api-keys")
  @RequirePermissions("tenants:read")
  listApiKeys(@Req() request: AuthenticatedAdminRequest, @Param("id") id: string) {
    return this.tenantsService.listApiKeys(id, request.user.sub);
  }

  @Post(":id/api-keys")
  @RequirePermissions("tenants:write")
  createApiKey(
    @Req() request: AuthenticatedAdminRequest,
    @Param("id") id: string,
    @Body() body: CreateTenantApiKeyDto,
  ) {
    return this.tenantsService.createApiKey(id, body.name, request.user.sub);
  }

  @Delete(":id/api-keys/:apiKeyId")
  @RequirePermissions("tenants:write")
  revokeApiKey(
    @Req() request: AuthenticatedAdminRequest,
    @Param("id") id: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    return this.tenantsService.revokeApiKey(id, apiKeyId, request.user.sub);
  }

  @Patch(":id/users/:userId/status")
  @RequirePermissions("tenants:write")
  updateUserStatus(
    @Req() request: AuthenticatedAdminRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() body: UpdateTenantUserStatusDto,
  ) {
    return this.tenantsService.updateUserStatus(id, userId, body.status, request.user.sub);
  }

  @Patch(":id/users/:userId/roles")
  @RequirePermissions("tenants:write")
  updateUserRoles(
    @Req() request: AuthenticatedAdminRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() body: UpdateTenantUserRolesDto,
  ) {
    return this.tenantsService.updateUserRoles(id, userId, body.roleSlugs, request.user.sub);
  }

  @Get(":id/roles")
  @RequirePermissions("tenants:read")
  listRoles(@Param("id") id: string) {
    return this.tenantsService.listRoles(id);
  }

  @Post(":id/roles")
  @RequirePermissions("tenants:write")
  createRole(@Param("id") id: string, @Body() body: CreateRoleDto) {
    return this.tenantsService.createRole(id, body);
  }
}
