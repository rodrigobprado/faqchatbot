import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
// NestJS's emitDecoratorMetadata needs a real (non `import type`) reference to
// resolve DI/ValidationPipe metatypes at runtime; `import type` here would make
// ValidationPipe silently skip validation for these DTOs.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuthService } from "./auth.service.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdminLoginDto } from "./dto/admin-login.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RefreshTokenDto } from "./dto/refresh-token.dto.js";

@ApiTags("auth")
@Controller("v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() body: AdminLoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }
}
