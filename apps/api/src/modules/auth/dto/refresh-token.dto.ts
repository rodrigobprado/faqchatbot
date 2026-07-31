import type { RefreshTokenRequest } from "@faqchatbot/contracts";
import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto implements RefreshTokenRequest {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
