import type { AdminLoginRequest } from "@faqchatbot/contracts";
import { IsEmail, MinLength } from "class-validator";

export class AdminLoginDto implements AdminLoginRequest {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
