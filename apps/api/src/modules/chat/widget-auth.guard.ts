import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  decodeWidgetAccessToken,
  type WidgetAccessTokenPayload,
  resolveWidgetTokenSecret
} from "../../auth/widget-token.js";

export type WidgetRequest = FastifyRequest & {
  widgetUser?: WidgetAccessTokenPayload;
};

@Injectable()
export class WidgetAuthGuard implements CanActivate {
  private readonly widgetTokenSecret = resolveWidgetTokenSecret();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<WidgetRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing widget access token");
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Missing widget access token");
    }

    try {
      const payload = decodeWidgetAccessToken(token, this.widgetTokenSecret);
      if (payload.scope !== "widget") {
        throw new UnauthorizedException("Invalid widget access token");
      }
      if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException("Widget access token expired");
      }

      request.widgetUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid widget access token");
    }
  }
}
