import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AdminRequest } from "../auth/admin-auth.guard.js";
import { AdminAuthGuard } from "../auth/admin-auth.guard.js";
import { TenantsService } from "./tenants.service.js";

@ApiTags("admin-tenants")
@UseGuards(AdminAuthGuard)
@Controller("v1/admin/tenants")
export class AdminTenantsController {
  constructor(@Inject(TenantsService) private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOkResponse({ description: "Lists tenants visible to the current admin" })
  list(@Req() request: AdminRequest) {
    return this.tenantsService.listTenants(request.adminUser!);
  }

  @Get("plans")
  @ApiOkResponse({ description: "Lists available plans" })
  listPlans(@Req() request: AdminRequest) {
    return this.tenantsService.listPlans(request.adminUser!);
  }

  @Get(":tenantId/conversations")
  @ApiOkResponse({ description: "Lists tenant conversations" })
  listConversations(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listConversations(request.adminUser!, tenantId);
  }

  @Get(":tenantId/sessions")
  @ApiOkResponse({ description: "Lists tenant widget sessions" })
  listSessions(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listSessions(request.adminUser!, tenantId);
  }

  @Get(":tenantId/conversations/:conversationId")
  @ApiOkResponse({ description: "Gets a tenant conversation with messages" })
  getConversation(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Param("conversationId") conversationId: string,
  ) {
    return this.tenantsService.getConversation(request.adminUser!, tenantId, conversationId);
  }

  @Post()
  @ApiOkResponse({ description: "Creates a tenant" })
  create(@Req() request: AdminRequest, @Body() body: unknown) {
    return this.tenantsService.createTenant(request.adminUser!, body);
  }

  @Get(":tenantId")
  @ApiOkResponse({ description: "Gets a tenant" })
  get(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.getTenant(request.adminUser!, tenantId);
  }

  @Patch(":tenantId")
  @ApiOkResponse({ description: "Updates a tenant" })
  update(@Req() request: AdminRequest, @Param("tenantId") tenantId: string, @Body() body: unknown) {
    return this.tenantsService.updateTenant(request.adminUser!, tenantId, body);
  }

  @Delete(":tenantId")
  @ApiOkResponse({ description: "Deletes a tenant" })
  remove(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.deleteTenant(request.adminUser!, tenantId);
  }

  @Get(":tenantId/domains")
  @ApiOkResponse({ description: "Lists tenant domains" })
  listDomains(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listDomains(request.adminUser!, tenantId);
  }

  @Post(":tenantId/domains")
  @ApiOkResponse({ description: "Creates a tenant domain" })
  createDomain(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.createDomain(request.adminUser!, tenantId, body);
  }

  @Delete(":tenantId/domains/:domainId")
  @ApiOkResponse({ description: "Deletes a tenant domain" })
  deleteDomain(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Param("domainId") domainId: string,
  ) {
    return this.tenantsService.deleteDomain(request.adminUser!, tenantId, domainId);
  }

  @Get(":tenantId/config")
  @ApiOkResponse({ description: "Gets tenant widget config" })
  getConfig(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.getTenantConfig(request.adminUser!, tenantId);
  }

  @Put(":tenantId/config")
  @ApiOkResponse({ description: "Upserts tenant widget config" })
  upsertConfig(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.upsertTenantConfig(request.adminUser!, tenantId, body);
  }

  @Get(":tenantId/agent-config")
  @ApiOkResponse({ description: "Gets tenant agent config" })
  getAgentConfig(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.getTenantAgentConfig(request.adminUser!, tenantId);
  }

  @Put(":tenantId/agent-config")
  @ApiOkResponse({ description: "Upserts tenant agent config" })
  upsertAgentConfig(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.upsertTenantAgentConfig(request.adminUser!, tenantId, body);
  }

  @Get(":tenantId/users")
  @ApiOkResponse({ description: "Lists tenant users" })
  listUsers(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listUsers(request.adminUser!, tenantId);
  }

  @Post(":tenantId/users")
  @ApiOkResponse({ description: "Invites a tenant user" })
  inviteUser(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.inviteUser(request.adminUser!, tenantId, body);
  }

  @Patch(":tenantId/users/:userId/roles")
  @ApiOkResponse({ description: "Updates tenant user roles" })
  updateUserRoles(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Param("userId") userId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.updateUserRoles(request.adminUser!, tenantId, userId, body);
  }

  @Get(":tenantId/roles")
  @ApiOkResponse({ description: "Lists tenant roles" })
  listRoles(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listRoles(request.adminUser!, tenantId);
  }

  @Get(":tenantId/api-keys")
  @ApiOkResponse({ description: "Lists tenant api keys" })
  listApiKeys(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listApiKeys(request.adminUser!, tenantId);
  }

  @Get(":tenantId/analytics")
  @ApiOkResponse({ description: "Lists tenant analytics events and aggregates" })
  listAnalytics(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listAnalytics(request.adminUser!, tenantId);
  }

  @Get(":tenantId/audit-logs")
  @ApiOkResponse({ description: "Lists tenant audit logs" })
  listAuditLogs(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listAuditLogs(request.adminUser!, tenantId);
  }

  @Get(":tenantId/system-logs")
  @ApiOkResponse({ description: "Lists tenant system logs" })
  listSystemLogs(@Req() request: AdminRequest, @Param("tenantId") tenantId: string) {
    return this.tenantsService.listSystemLogs(request.adminUser!, tenantId);
  }

  @Post(":tenantId/api-keys")
  @ApiOkResponse({ description: "Creates a tenant api key" })
  createApiKey(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
  ) {
    return this.tenantsService.createApiKey(request.adminUser!, tenantId, body);
  }

  @Delete(":tenantId/api-keys/:apiKeyId")
  @ApiOkResponse({ description: "Revokes a tenant api key" })
  revokeApiKey(
    @Req() request: AdminRequest,
    @Param("tenantId") tenantId: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    return this.tenantsService.revokeApiKey(request.adminUser!, tenantId, apiKeyId);
  }
}

@ApiTags("public-tenants")
@Controller("v1/widget/public")
export class PublicTenantsController {
  constructor(@Inject(TenantsService) private readonly tenantsService: TenantsService) {}

  @Get(":publicId/config")
  @ApiOkResponse({ description: "Gets the public widget config for a tenant" })
  getPublicConfig(@Param("publicId") publicId: string) {
    return this.tenantsService.getPublicConfig(publicId);
  }
}
