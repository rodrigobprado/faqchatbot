import type { z } from "zod";
export declare const tenantStatusSchema: z.ZodEnum<{
    active: "active";
    inactive: "inactive";
    suspended: "suspended";
}>;
export declare const tenantPlanSchema: z.ZodEnum<{
    free: "free";
    starter: "starter";
    growth: "growth";
    enterprise: "enterprise";
}>;
export declare const agentProviderSchema: z.ZodEnum<{
    n8n: "n8n";
    openai_responses: "openai_responses";
    langgraph: "langgraph";
    flowise: "flowise";
    dify: "dify";
    crewai: "crewai";
    mcp: "mcp";
    custom: "custom";
}>;
export declare const tenantPublicConfigSchema: z.ZodObject<{
    id: z.ZodString;
    publicId: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        inactive: "inactive";
        suspended: "suspended";
    }>;
    plan: z.ZodEnum<{
        free: "free";
        starter: "starter";
        growth: "growth";
        enterprise: "enterprise";
    }>;
    domain: z.ZodString;
    locale: z.ZodDefault<z.ZodString>;
    theme: z.ZodDefault<z.ZodEnum<{
        light: "light";
        dark: "dark";
        auto: "auto";
    }>>;
    primaryColor: z.ZodDefault<z.ZodString>;
    iconUrl: z.ZodOptional<z.ZodString>;
    initialMessage: z.ZodDefault<z.ZodString>;
    placeholder: z.ZodDefault<z.ZodString>;
    limits: z.ZodObject<{
        messagesPerMinute: z.ZodNumber;
        conversationsPerDay: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type TenantPlan = z.infer<typeof tenantPlanSchema>;
export type AgentProvider = z.infer<typeof agentProviderSchema>;
export type TenantPublicConfig = z.infer<typeof tenantPublicConfigSchema>;
//# sourceMappingURL=tenants.d.ts.map