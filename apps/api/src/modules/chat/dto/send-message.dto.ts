import { IsObject, IsUUID } from "class-validator";

export class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  // Validated against the Zod discriminated union (messageContentSchema) in
  // ChatService.sendMessage, not class-validator — 11 rich-content shapes
  // aren't practical to model as per-type nested DTOs.
  @IsObject()
  content!: Record<string, unknown>;
}
