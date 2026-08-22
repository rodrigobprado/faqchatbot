import { z } from "zod";
const httpUrlSchema = z
    .string()
    .refine((value) => {
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    }
    catch {
        return false;
    }
}, {
    message: "URL must use http or https"
});
export const pageContextSchema = z.object({
    url: httpUrlSchema,
    title: z.string().max(300).optional(),
    language: z.string().max(35).optional(),
    referrer: httpUrlSchema.optional().or(z.literal("")),
    utm: z.record(z.string(), z.string()).default({}),
    viewport: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive()
    }),
    userAgent: z.string().max(1000).optional(),
    currentPage: z.string().max(2000).optional(),
    timestamp: z.string().datetime()
});
export const widgetSessionStartRequestSchema = z.object({
    agentId: z.string().min(1).max(120),
    visitorId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional(),
    context: pageContextSchema
});
export const widgetSessionStartResponseSchema = z.object({
    accessToken: z.string().min(1),
    expiresInSeconds: z.number().int().positive(),
    visitorId: z.string().uuid(),
    sessionId: z.string().uuid(),
    conversationId: z.string().uuid(),
    tenant: z.object({
        id: z.string().uuid(),
        publicId: z.string().min(1),
        name: z.string().min(1)
    }),
    config: z.object({
        locale: z.string(),
        theme: z.enum(["light", "dark", "auto"]),
        position: z.enum(["bottom-right", "bottom-left"]),
        primaryColor: z.string(),
        initialMessage: z.string(),
        placeholder: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive()
    })
});
//# sourceMappingURL=sessions.js.map