import { describe, expect, it } from "vitest";
import { agentProviderSchema, tenantPublicConfigSchema } from "./tenants.js";

describe("tenantPublicConfigSchema", () => {
  it("accepts a valid public tenant config", () => {
    const config = tenantPublicConfigSchema.parse({
      id: "00000000-0000-4000-8000-000000000002",
      publicId: "empresa123",
      name: "Empresa 123",
      status: "active",
      plan: "growth",
      domain: "example.com",
      iconUrl: "https://cdn.example.com/icon.png",
      limits: {
        messagesPerMinute: 20,
        conversationsPerDay: 1000
      }
    });

    expect(config.theme).toBe("auto");
    expect(config.locale).toBe("pt-BR");
  });

  it("rejects unsafe icon URLs", () => {
    expect(() =>
      tenantPublicConfigSchema.parse({
        id: "00000000-0000-4000-8000-000000000002",
        publicId: "empresa123",
        name: "Empresa 123",
        status: "active",
        plan: "growth",
        domain: "example.com",
        iconUrl: "javascript:alert(1)",
        limits: {
          messagesPerMinute: 20,
          conversationsPerDay: 1000
        }
      }),
    ).toThrow();
  });

  it("rejects malformed icon URLs", () => {
    expect(() =>
      tenantPublicConfigSchema.parse({
        id: "00000000-0000-4000-8000-000000000002",
        publicId: "empresa123",
        name: "Empresa 123",
        status: "active",
        plan: "growth",
        domain: "example.com",
        iconUrl: "not-a-url",
        limits: {
          messagesPerMinute: 20,
          conversationsPerDay: 1000
        }
      }),
    ).toThrow();
  });
});

describe("agentProviderSchema", () => {
  it("includes n8n as one adapter, not the only platform target", () => {
    expect(agentProviderSchema.options).toContain("n8n");
    expect(agentProviderSchema.options).toContain("openai_responses");
    expect(agentProviderSchema.options).toContain("mcp");
  });
});
