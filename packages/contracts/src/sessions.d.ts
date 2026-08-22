import type { z } from "zod";
export declare const pageContextSchema: z.ZodObject<{
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    referrer: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    utm: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    viewport: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, z.core.$strip>;
    userAgent: z.ZodOptional<z.ZodString>;
    currentPage: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const widgetSessionStartRequestSchema: z.ZodObject<{
    agentId: z.ZodString;
    visitorId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    context: z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        referrer: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        utm: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        viewport: z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, z.core.$strip>;
        userAgent: z.ZodOptional<z.ZodString>;
        currentPage: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const widgetSessionStartResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    expiresInSeconds: z.ZodNumber;
    visitorId: z.ZodString;
    sessionId: z.ZodString;
    conversationId: z.ZodString;
    tenant: z.ZodObject<{
        id: z.ZodString;
        publicId: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>;
    config: z.ZodObject<{
        locale: z.ZodString;
        theme: z.ZodEnum<{
            light: "light";
            dark: "dark";
            auto: "auto";
        }>;
        position: z.ZodEnum<{
            "bottom-right": "bottom-right";
            "bottom-left": "bottom-left";
        }>;
        primaryColor: z.ZodString;
        initialMessage: z.ZodString;
        placeholder: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PageContext = z.infer<typeof pageContextSchema>;
export type WidgetSessionStartRequest = z.infer<typeof widgetSessionStartRequestSchema>;
export type WidgetSessionStartResponse = z.infer<typeof widgetSessionStartResponseSchema>;
//# sourceMappingURL=sessions.d.ts.map