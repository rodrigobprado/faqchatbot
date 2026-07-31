import { tenantPublicConfigSchema, type TenantPublicConfig } from "@faqchatbot/contracts";
import { ForbiddenException } from "@nestjs/common";
import type { plans, tenantConfigs, tenants } from "../../db/schema.js";

type TenantRow = typeof tenants.$inferSelect;
type PlanRow = typeof plans.$inferSelect;
type TenantConfigRow = typeof tenantConfigs.$inferSelect;

const DEFAULT_LIMITS = { messagesPerMinute: 20, conversationsPerDay: 200 };

export const resolveTenantPublicConfig = (
  tenant: TenantRow,
  plan: PlanRow,
  config: TenantConfigRow | null,
  domain: string,
): TenantPublicConfig => {
  if (tenant.status !== "active") {
    throw new ForbiddenException("Tenant is not active");
  }

  return tenantPublicConfigSchema.parse({
    id: tenant.id,
    publicId: tenant.publicId,
    name: tenant.name,
    status: tenant.status,
    plan: plan.slug,
    domain,
    locale: tenant.defaultLocale,
    theme: config?.theme ?? "auto",
    primaryColor: config?.primaryColor ?? "#2563eb",
    iconUrl: config?.iconUrl ?? undefined,
    initialMessage: config?.initialMessage || "Ola! Como posso ajudar?",
    placeholder: config?.placeholder || "Digite sua mensagem",
    limits: {
      ...DEFAULT_LIMITS,
      ...(plan.limits as Partial<typeof DEFAULT_LIMITS> | undefined)
    }
  });
};
