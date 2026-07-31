import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { plans, tenantConfigs, tenants } from "../../db/schema.js";
import { resolveTenantPublicConfig } from "./tenant-public-config.js";

type TenantRow = typeof tenants.$inferSelect;
type PlanRow = typeof plans.$inferSelect;
type TenantConfigRow = typeof tenantConfigs.$inferSelect;

const baseTenant: TenantRow = {
  id: randomUUID(),
  publicId: "acme",
  name: "Acme Inc",
  status: "active",
  planId: randomUUID(),
  defaultLocale: "pt-BR",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null
};

const basePlan: PlanRow = {
  id: baseTenant.planId,
  slug: "starter",
  name: "Starter",
  limits: {},
  priceCents: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("resolveTenantPublicConfig", () => {
  it("throws ForbiddenException for a non-active tenant", () => {
    const tenant = { ...baseTenant, status: "suspended" as const };

    expect(() => resolveTenantPublicConfig(tenant, basePlan, null, "acme.example.com")).toThrow(
      ForbiddenException,
    );
  });

  it("falls back to default limits when the plan has no explicit limits", () => {
    const result = resolveTenantPublicConfig(baseTenant, basePlan, null, "acme.example.com");

    expect(result.limits).toEqual({ messagesPerMinute: 20, conversationsPerDay: 200 });
    expect(result.theme).toBe("auto");
    expect(result.domain).toBe("acme.example.com");
  });

  it("applies visual config overrides and respects explicit plan limits", () => {
    const config: TenantConfigRow = {
      id: randomUUID(),
      tenantId: baseTenant.id,
      theme: "dark",
      primaryColor: "#111111",
      iconUrl: "https://cdn.example.com/icon.png",
      initialMessage: "Bem-vindo",
      placeholder: "Fale com a gente",
      updatedAt: new Date()
    };
    const plan: PlanRow = { ...basePlan, limits: { messagesPerMinute: 5, conversationsPerDay: 50 } };

    const result = resolveTenantPublicConfig(baseTenant, plan, config, "acme.example.com");

    expect(result.theme).toBe("dark");
    expect(result.initialMessage).toBe("Bem-vindo");
    expect(result.limits).toEqual({ messagesPerMinute: 5, conversationsPerDay: 50 });
  });

  it("never includes webhook or agent fields in the public payload", () => {
    const result = resolveTenantPublicConfig(baseTenant, basePlan, null, "acme.example.com");

    expect(JSON.stringify(result)).not.toMatch(/webhook/i);
  });
});
