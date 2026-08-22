import type { z } from "zod";
export declare const createTenantRequestSchema: z.ZodObject<{
    publicId: z.ZodString;
    name: z.ZodString;
    planId: z.ZodString;
    defaultLocale: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const updateTenantRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
        suspended: "suspended";
    }>>;
    planId: z.ZodOptional<z.ZodString>;
    defaultLocale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const tenantAdminViewSchema: z.ZodObject<{
    id: z.ZodString;
    publicId: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        inactive: "inactive";
        suspended: "suspended";
    }>;
    planId: z.ZodString;
    defaultLocale: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createTenantDomainRequestSchema: z.ZodObject<{
    domain: z.ZodString;
}, z.core.$strip>;
export declare const tenantDomainAdminViewSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    domain: z.ZodString;
    isVerified: z.ZodBoolean;
}, z.core.$strip>;
export declare const tenantConfigRequestSchema: z.ZodObject<{
    theme: z.ZodDefault<z.ZodEnum<{
        light: "light";
        dark: "dark";
        auto: "auto";
    }>>;
    primaryColor: z.ZodDefault<z.ZodString>;
    iconUrl: z.ZodOptional<z.ZodString>;
    initialMessage: z.ZodDefault<z.ZodString>;
    placeholder: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const tenantAgentConfigRequestSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
    model: z.ZodOptional<z.ZodString>;
    webhookUrl: z.ZodOptional<z.ZodString>;
    webhookSecretRef: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    retryPolicy: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;
export type TenantAdminView = z.infer<typeof tenantAdminViewSchema>;
export type CreateTenantDomainRequest = z.infer<typeof createTenantDomainRequestSchema>;
export type TenantDomainAdminView = z.infer<typeof tenantDomainAdminViewSchema>;
export type TenantConfigRequest = z.infer<typeof tenantConfigRequestSchema>;
export type TenantAgentConfigRequest = z.infer<typeof tenantAgentConfigRequestSchema>;
//# sourceMappingURL=admin-tenants.d.ts.map