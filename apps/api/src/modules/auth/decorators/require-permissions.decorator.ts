import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_METADATA_KEY = "requiredPermissions";

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
