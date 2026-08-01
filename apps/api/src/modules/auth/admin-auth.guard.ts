import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { createAdminTokenSecrets } from "./auth.service.js";
import { decodeAdminAccessToken } from "../../auth/admin-token.js";
import type { AdminAccessTokenPayload } from "../../auth/admin-token.js";

export type AdminRequest = FastifyRequest & {
  adminUser?: AdminAccessTokenPayload;
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly accessTokenSecret = createAdminTokenSecrets().accessTokenSecret;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing admin access token");
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Missing admin access token");
    }

    try {
      const payload = decodeAdminAccessToken(token, this.accessTokenSecret);
      if (payload.scope !== "admin") {
        throw new UnauthorizedException("Invalid admin access token");
      }
      if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException("Admin access token expired");
      }

      request.adminUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid admin access token");
    }
  }
}
