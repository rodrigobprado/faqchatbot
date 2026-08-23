import { BadRequestException, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import type { AccessTokenClaims } from "../auth/access-token-claims.js";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StorageService } from "./storage.service.js";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type AuthenticatedAdminRequest = FastifyRequest & { user: AccessTokenClaims };

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{
    mimetype: string;
    fieldname: string;
    toBuffer: () => Promise<Buffer>;
  } | undefined>;
};

@ApiTags("admin-files")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/admin/files")
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Post("upload")
  @RequirePermissions("tenants:write")
  async upload(@Req() request: AuthenticatedAdminRequest, @Query("purpose") purpose?: string) {
    if (purpose !== undefined && !["logo", "avatar", "conversation"].includes(purpose)) {
      throw new BadRequestException(`Unknown purpose "${purpose}"`);
    }

    const multipart = request as unknown as MultipartRequest;
    const file = await multipart.file();

    if (!file || file.fieldname !== "file") {
      throw new BadRequestException('Expected a multipart file field named "file"');
    }

    const buffer = await file.toBuffer();
    if (buffer.byteLength === 0) {
      throw new BadRequestException("File is empty");
    }
    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("File exceeds the maximum allowed size");
    }

    return this.storage.upload({
      tenantId: request.user.tenantId,
      buffer,
      mimeType: file.mimetype,
      sizeBytes: buffer.byteLength,
      uploadedByUserId: request.user.sub
    });
  }

  @Get()
  @RequirePermissions("tenants:read")
  list(@Req() request: AuthenticatedAdminRequest) {
    return this.storage.list(request.user.tenantId);
  }

  @Get(":id/url")
  @RequirePermissions("tenants:read")
  async downloadUrl(@Req() request: AuthenticatedAdminRequest, @Param("id") id: string) {
    return { url: await this.storage.createDownloadUrl(id, request.user.tenantId) };
  }
}
