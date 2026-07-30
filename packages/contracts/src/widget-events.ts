import { z } from "zod";

export const widgetEventNameSchema = z.enum([
  "onOpen",
  "onClose",
  "onMessage",
  "onTyping",
  "onError",
  "onConnect",
  "onDisconnect",
  "onConversationStart",
  "onConversationEnd"
]);

export type WidgetEventName = z.infer<typeof widgetEventNameSchema>;

