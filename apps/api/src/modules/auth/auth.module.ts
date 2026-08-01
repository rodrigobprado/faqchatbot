import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module.js";
import { DatabaseService } from "../../db/database.service.js";
import { createUserRolesRepository } from "../../db/repositories/user-roles.repository.js";
import { createUsersRepository } from "../../db/repositories/users.repository.js";
import { AuthController } from "./auth.controller.js";
import { AuthService, createAdminTokenSecrets } from "./auth.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => {
        const { db } = databaseService;
        const { accessTokenSecret, refreshTokenSecret } = createAdminTokenSecrets();

        return new AuthService({
          users: createUsersRepository(db),
          userRoles: createUserRolesRepository(db),
          accessTokenSecret,
          refreshTokenSecret,
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 60 * 60 * 24 * 30
        });
      }
    }
  ]
})
export class AuthModule {}
