import type { PlatformEnvironment } from "@faqchatbot/config";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- needed at runtime for Nest DI metadata
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import { ENV } from "../../core/core.module.js";
import type { WidgetTokenClaims } from "../access-token-claims.js";

export type AuthenticatedWidgetRequest = FastifyRequest & { user: WidgetTokenClaims };

const BEARER_PREFIX = "Bearer ";

@Injectable()
export class WidgetJwtGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: PlatformEnvironment,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedWidgetRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith(BEARER_PREFIX)
      ? authorization.slice(BEARER_PREFIX.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const claims = await this.jwtService.verifyAsync<WidgetTokenClaims>(token, {
        secret: this.env.JWT_WIDGET_SECRET
      });

      if (claims.scope !== "widget") {
        throw new Error("wrong scope");
      }

      request.user = claims;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
