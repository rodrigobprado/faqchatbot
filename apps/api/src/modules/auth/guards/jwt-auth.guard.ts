import type { PlatformEnvironment } from "@faqchatbot/config";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- needed at runtime for Nest DI metadata
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import { ENV } from "../../core/core.module.js";
import type { AccessTokenClaims } from "../access-token-claims.js";

export type AuthenticatedRequest = FastifyRequest & { user: AccessTokenClaims };

const BEARER_PREFIX = "Bearer ";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: PlatformEnvironment,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith(BEARER_PREFIX)
      ? authorization.slice(BEARER_PREFIX.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const claims = await this.jwtService.verifyAsync<AccessTokenClaims>(token, {
        secret: this.env.JWT_ACCESS_SECRET
      });

      if (claims.scope !== "admin") {
        throw new Error("wrong scope");
      }

      request.user = claims;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
