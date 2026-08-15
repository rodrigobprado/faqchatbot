import { randomUUID } from "node:crypto";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import {
  createAdminAccessToken,
  createAdminRefreshToken,
  decodeAdminRefreshToken,
  type AdminAccessTokenPayload
} from "../../auth/admin-token.js";
import { verifyPassword } from "../../auth/password.js";

type UserRecord = Readonly<{
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  status: string;
}>;

export type AuthServiceDependencies = Readonly<{
  users: {
    findByEmail(email: string): Promise<UserRecord | null>;
    findById(id: string): Promise<UserRecord | null>;
  };
  userRoles: {
    listRoleSlugsByUserId(userId: string): Promise<Array<Readonly<{ slug: string }>>>;
  };
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}>;

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(256)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const resolveTokenSecret = (
  primaryValue: string | undefined,
  primaryEnvName: string,
  fallbackValue: string | undefined,
  fallbackEnvName: string,
): string => {
  if (primaryValue && primaryValue.trim()) {
    return primaryValue;
  }

  if (fallbackValue && fallbackValue.trim()) {
    return fallbackValue;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${primaryEnvName} or ${fallbackEnvName} is required in production`,
    );
  }

  return `dev-${primaryEnvName.toLowerCase()}-dev-${primaryEnvName.toLowerCase()}`;
};

export const createAdminTokenSecrets = () => ({
  accessTokenSecret: resolveTokenSecret(
    process.env.JWT_ADMIN_SECRET,
    "JWT_ADMIN_SECRET",
    process.env.JWT_ACCESS_SECRET,
    "JWT_ACCESS_SECRET",
  ),
  refreshTokenSecret: resolveTokenSecret(
    process.env.JWT_ADMIN_REFRESH_SECRET,
    "JWT_ADMIN_REFRESH_SECRET",
    process.env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET",
  )
});

export class AuthService {
  constructor(private readonly dependencies: AuthServiceDependencies) {}

  async login(rawInput: unknown) {
    const input = this.parseLoginInput(rawInput);
    const user = await this.dependencies.users.findByEmail(input.email);

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user);
  }

  async refresh(rawInput: unknown) {
    const input = this.parseRefreshInput(rawInput);
    const payload = this.decodeRefreshToken(input.refreshToken);
    const user = await this.dependencies.users.findById(payload.userId);

    if (!user || user.status !== "active" || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.issueTokens(user);
  }

  private parseLoginInput(rawInput: unknown) {
    try {
      return loginSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid login payload");
    }
  }

  private parseRefreshInput(rawInput: unknown) {
    try {
      return refreshSchema.parse(rawInput);
    } catch {
      throw new BadRequestException("Invalid refresh payload");
    }
  }

  private decodeRefreshToken(token: string) {
    const payload = decodeAdminRefreshToken(token, this.dependencies.refreshTokenSecret);

    if (payload.scope !== "admin_refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Refresh token expired");
    }

    return payload;
  }

  private async issueTokens(user: UserRecord) {
    const roles = await this.dependencies.userRoles.listRoleSlugsByUserId(user.id);
    const roleSlugs = roles.map((role) => role.slug);
    const issuedAt = Math.floor(Date.now() / 1000);
    const accessExpiresAt = issuedAt + this.dependencies.accessTokenTtlSeconds;
    const refreshExpiresAt = issuedAt + this.dependencies.refreshTokenTtlSeconds;
    const accessTokenPayload: AdminAccessTokenPayload = {
      scope: "admin",
      userId: user.id,
      tenantId: user.tenantId,
      roles: roleSlugs,
      issuedAt,
      expiresAt: accessExpiresAt
    };

    return {
      accessToken: createAdminAccessToken(accessTokenPayload, this.dependencies.accessTokenSecret),
      refreshToken: createAdminRefreshToken(
        {
          scope: "admin_refresh",
          userId: user.id,
          tenantId: user.tenantId,
          issuedAt,
          expiresAt: refreshExpiresAt,
          nonce: randomUUID()
        },
        this.dependencies.refreshTokenSecret,
      ),
      expiresInSeconds: this.dependencies.accessTokenTtlSeconds,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: roleSlugs
      }
    };
  }
}
