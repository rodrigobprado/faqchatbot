import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";

@ApiTags("auth")
@Controller("v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("login")
  @ApiOkResponse({ description: "Authenticates an admin user" })
  login(@Body() body: unknown) {
    return this.authService.login(body);
  }

  @Post("refresh")
  @ApiOkResponse({ description: "Refreshes an admin access token" })
  refresh(@Body() body: unknown) {
    return this.authService.refresh(body);
  }
}
