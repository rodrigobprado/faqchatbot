import { S3Client } from "@aws-sdk/client-s3";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { Module, type Provider } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { ENV } from "../core/core.module.js";
import { FilesController } from "./files.controller.js";
import {
  buildS3ClientConfig,
  defaultPresigner,
  S3_CLIENT,
  S3_PRESIGNER,
  StorageService
} from "./storage.service.js";

const s3ClientProvider: Provider = {
  provide: S3_CLIENT,
  useFactory: (env: PlatformEnvironment) => new S3Client(buildS3ClientConfig(env)),
  inject: [ENV]
};

const presignerProvider: Provider = {
  provide: S3_PRESIGNER,
  useValue: defaultPresigner
};

@Module({
  imports: [],
  controllers: [FilesController],
  providers: [StorageService, s3ClientProvider, presignerProvider, JwtAuthGuard, PermissionsGuard],
  exports: [StorageService]
})
export class StorageModule {}
