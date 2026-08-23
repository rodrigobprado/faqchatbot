import { z } from "zod";
import { chatMessageSchema, messageContentSchema } from "./messages.js";
export const sendMessageRequestSchema = z.object({
    conversationId: z.string().uuid(),
    content: messageContentSchema
});
export const conversationHistoryResponseSchema = z.object({
    messages: z.array(chatMessageSchema)
});
export const chatStreamEventSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("typing") }),
    z.object({ type: z.literal("token"), token: z.string() }),
    z.object({ type: z.literal("message"), message: chatMessageSchema }),
    z.object({ type: z.literal("error"), message: z.string() })
]);
//# sourceMappingURL=chat.js.map