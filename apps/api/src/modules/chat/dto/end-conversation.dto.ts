import { IsIn, IsOptional } from "class-validator";

export class EndConversationDto {
  @IsOptional()
  @IsIn(["resolved", "abandoned"])
  reason?: "resolved" | "abandoned";
}
