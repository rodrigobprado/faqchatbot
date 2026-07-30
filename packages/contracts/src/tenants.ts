import { z } from "zod";

const httpUrlSchema = z
  .string()
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, {
    message: "URL must use http or https"
  });

export const tenantStatusSchema = z.enum(["active", "inactive", "suspended"]);
export const tenantPlanSchema = z.enum(["free", "starter", "growth", "enterprise"]);
export const agentProviderSchema = z.enum([
  "n8n",
  "openai_responses",
  "langgraph",
  "flowise",
  "dify",
  "crewai",
  "mcp",
  "custom"
]);

export const tenantPublicConfigSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  status: tenantStatusSchema,
  plan: tenantPlanSchema,
  domain: z.string().min(1).max(255),
  locale: z.string().default("pt-BR"),
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  primaryColor: z.string().default("#2563eb"),
  iconUrl: httpUrlSchema.optional(),
  initialMessage: z.string().max(500).default("Ola! Como posso ajudar?"),
  placeholder: z.string().max(120).default("Digite sua mensagem"),
  limits: z.object({
    messagesPerMinute: z.number().int().positive(),
    conversationsPerDay: z.number().int().positive()
  })
});

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type TenantPlan = z.infer<typeof tenantPlanSchema>;
export type AgentProvider = z.infer<typeof agentProviderSchema>;
export type TenantPublicConfig = z.infer<typeof tenantPublicConfigSchema>;
