import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Injectable } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- needed at runtime for Nest DI metadata
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_METADATA_KEY } from "../decorators/require-permissions.decorator.js";
import type { AuthenticatedRequest } from "./jwt-auth.guard.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_METADATA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(request.user?.permissions ?? []);
    const hasAll = requiredPermissions.every((permission) => granted.has(permission));

    if (!hasAll) {
      throw new ForbiddenException("Missing required permission");
    }

    return true;
  }
}
