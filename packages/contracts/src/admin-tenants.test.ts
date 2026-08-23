import { describe, expect, it } from "vitest";
import {
  createTenantDomainRequestSchema,
  createTenantRequestSchema,
  tenantAgentConfigRequestSchema,
  updateTenantRequestSchema
} from "./admin-tenants.js";

describe("createTenantRequestSchema", () => {
  it("applies the default locale when omitted", () => {
    const request = createTenantRequestSchema.parse({
      publicId: "acme",
      name: "Acme Inc",
      planId: "3e15f2c1-2f0b-4a5c-9a9c-4d9a1f1f9a2b"
    });

    expect(request.defaultLocale).toBe("pt-BR");
  });

  it("rejects an invalid planId", () => {
    expect(() =>
      createTenantRequestSchema.parse({ publicId: "acme", name: "Acme Inc", planId: "not-a-uuid" }),
    ).toThrow();
  });
});

describe("updateTenantRequestSchema", () => {
  it("accepts a partial update", () => {
    const request = updateTenantRequestSchema.parse({ status: "suspended" });
    expect(request.status).toBe("suspended");
  });
});

describe("createTenantDomainRequestSchema", () => {
  it("rejects an empty domain", () => {
    expect(() => createTenantDomainRequestSchema.parse({ domain: "" })).toThrow();
  });
});

describe("tenantAgentConfigRequestSchema", () => {
  it("never accepts a raw webhook secret, only a reference", () => {
    const request = tenantAgentConfigRequestSchema.parse({
      provider: "n8n",
      webhookUrl: "https://n8n.internal/webhook/abc",
      webhookSecretRef: "secrets-manager://tenant/webhook-secret"
    });

    expect(request.webhookSecretRef).toBe("secrets-manager://tenant/webhook-secret");
    expect(request.timeoutMs).toBe(15000);
  });
});
