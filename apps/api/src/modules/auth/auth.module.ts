import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { ApiKeyService } from "./api-key.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyService],
  exports: [ApiKeyService]
})
export class AuthModule {}
