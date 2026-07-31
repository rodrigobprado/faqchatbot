import type { AdminLoginResponse, RefreshTokenResponse } from "@faqchatbot/contracts";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
// NestJS resolves this constructor-injected class via emitDecoratorMetadata,
// which needs a real (non `import type`) reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { JwtService } from "@nestjs/jwt";
import { verifyPassword } from "../../auth/password.js";
import type { Database } from "../../db/client.js";
import { createAuditLogsRepository } from "../../db/repositories/audit-logs.repository.js";
import { createRolePermissionsRepository } from "../../db/repositories/role-permissions.repository.js";
import { createUserRolesRepository } from "../../db/repositories/user-roles.repository.js";
import { createUsersRepository } from "../../db/repositories/users.repository.js";
import type { AccessTokenClaims } from "./access-token-claims.js";
import { DATABASE, ENV } from "../core/core.module.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type RefreshTokenClaims = {
  sub: string;
  tenantId: string;
  scope: "admin_refresh";
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ENV) private readonly env: PlatformEnvironment,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AdminLoginResponse> {
    const users = createUsersRepository(this.db);
    const user = await users.findByEmail(email);
    const passwordMatches = user ? await verifyPassword(user.passwordHash, password) : false;

    if (!user || user.status !== "active" || !passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const { roleSlugs, permissionSlugs } = await this.resolveGrants(user.id);

    const auditLogs = createAuditLogsRepository(this.db);
    await auditLogs.create({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id
    });

    return {
      accessToken: this.signAccessToken(user.id, user.tenantId, roleSlugs, permissionSlugs),
      refreshToken: this.signRefreshToken(user.id, user.tenantId),
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      user: { id: user.id, email: user.email, tenantId: user.tenantId }
    };
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const claims = await this.verifyRefreshToken(refreshToken);

    const users = createUsersRepository(this.db);
    const user = await users.findById(claims.sub);

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("User is no longer active");
    }

    const { roleSlugs, permissionSlugs } = await this.resolveGrants(user.id);

    return {
      accessToken: this.signAccessToken(user.id, user.tenantId, roleSlugs, permissionSlugs),
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS
    };
  }

  private async resolveGrants(userId: string) {
    const userRoles = createUserRolesRepository(this.db);
    const rolePermissions = createRolePermissionsRepository(this.db);

    const [roleSlugs, permissionSlugs] = await Promise.all([
      userRoles.listRoleSlugsByUserId(userId),
      rolePermissions.listPermissionSlugsByUserId(userId)
    ]);

    return { roleSlugs, permissionSlugs };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenClaims> {
    try {
      const claims = await this.jwtService.verifyAsync<RefreshTokenClaims>(refreshToken, {
        secret: this.env.JWT_REFRESH_SECRET
      });

      if (claims.scope !== "admin_refresh") {
        throw new Error("wrong scope");
      }

      return claims;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private signAccessToken(userId: string, tenantId: string, roles: string[], permissions: string[]): string {
    const claims: AccessTokenClaims = { sub: userId, tenantId, roles, permissions, scope: "admin" };
    return this.jwtService.sign(claims, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    });
  }

  private signRefreshToken(userId: string, tenantId: string): string {
    const claims: RefreshTokenClaims = { sub: userId, tenantId, scope: "admin_refresh" };
    return this.jwtService.sign(claims, {
      secret: this.env.JWT_REFRESH_SECRET,
      expiresIn: REFRESH_TOKEN_TTL_SECONDS
    });
  }
}
