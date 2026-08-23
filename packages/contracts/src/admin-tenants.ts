import { z } from "zod";
import { agentProviderSchema, tenantStatusSchema } from "./tenants.js";

export const createTenantRequestSchema = z.object({
  publicId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  planId: z.string().uuid(),
  defaultLocale: z.string().min(2).max(20).default("pt-BR")
});

export const updateTenantRequestSchema = z.object({
  name: z.string().min(1).max(180).optional(),
  status: tenantStatusSchema.optional(),
  planId: z.string().uuid().optional(),
  defaultLocale: z.string().min(2).max(20).optional()
});

export const tenantAdminViewSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string(),
  name: z.string(),
  status: tenantStatusSchema,
  planId: z.string().uuid(),
  defaultLocale: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createTenantDomainRequestSchema = z.object({
  domain: z.string().min(1).max(255)
});

export const tenantDomainAdminViewSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  domain: z.string(),
  isVerified: z.boolean()
});

export const tenantConfigRequestSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  primaryColor: z.string().min(1).max(20).default("#2563eb"),
  iconUrl: z.string().url().optional(),
  initialMessage: z.string().max(500).default(""),
  placeholder: z.string().max(120).default("")
});

export const tenantAgentConfigRequestSchema = z.object({
  provider: agentProviderSchema,
  model: z.string().max(120).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecretRef: z.string().min(1).max(255).optional(),
  timeoutMs: z.number().int().positive().default(15000),
  retryPolicy: z.record(z.string(), z.unknown()).default({})
});

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;
export type TenantAdminView = z.infer<typeof tenantAdminViewSchema>;
export type CreateTenantDomainRequest = z.infer<typeof createTenantDomainRequestSchema>;
export type TenantDomainAdminView = z.infer<typeof tenantDomainAdminViewSchema>;
export type TenantConfigRequest = z.infer<typeof tenantConfigRequestSchema>;
export type TenantAgentConfigRequest = z.infer<typeof tenantAgentConfigRequestSchema>;
