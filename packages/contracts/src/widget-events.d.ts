import type { z } from "zod";
export declare const widgetEventNameSchema: z.ZodEnum<{
    onOpen: "onOpen";
    onClose: "onClose";
    onMessage: "onMessage";
    onTyping: "onTyping";
    onError: "onError";
    onConnect: "onConnect";
    onDisconnect: "onDisconnect";
    onConversationStart: "onConversationStart";
    onConversationEnd: "onConversationEnd";
}>;
export type WidgetEventName = z.infer<typeof widgetEventNameSchema>;
//# sourceMappingURL=widget-events.d.ts.map