import { describe, expect, it, vi } from "vitest";
import type { TenantsService } from "./tenants.service.js";
import { TenantsController } from "./tenants.controller.js";

const fakeService = (overrides: Partial<Record<keyof TenantsService, ReturnType<typeof vi.fn>>>) =>
  overrides as unknown as TenantsService;

describe("TenantsController", () => {
  it("delegates tenant creation", async () => {
    const create = vi.fn().mockResolvedValue({ id: "t1" });
    const controller = new TenantsController(fakeService({ create }));

    const body = { publicId: "acme", name: "Acme", planId: "p1", defaultLocale: "pt-BR" };
    await controller.create(body);

    expect(create).toHaveBeenCalledWith(body);
  });

  it("delegates listing tenants", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ list }));

    await controller.list();

    expect(list).toHaveBeenCalled();
  });

  it("delegates tenant update", async () => {
    const update = vi.fn().mockResolvedValue({ id: "t1", status: "suspended" });
    const controller = new TenantsController(fakeService({ update }));

    await controller.update("t1", { status: "suspended" });

    expect(update).toHaveBeenCalledWith("t1", { status: "suspended" });
  });

  it("delegates tenant removal", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const controller = new TenantsController(fakeService({ remove }));

    await controller.remove("t1");

    expect(remove).toHaveBeenCalledWith("t1");
  });

  it("delegates adding a domain", async () => {
    const addDomain = vi.fn().mockResolvedValue({ id: "d1" });
    const controller = new TenantsController(fakeService({ addDomain }));

    await controller.addDomain("t1", { domain: "acme.example.com" });

    expect(addDomain).toHaveBeenCalledWith("t1", { domain: "acme.example.com" });
  });

  it("delegates upserting the visual config", async () => {
    const upsertConfig = vi.fn().mockResolvedValue({ theme: "dark" });
    const controller = new TenantsController(fakeService({ upsertConfig }));

    const body = { theme: "dark" as const, primaryColor: "#000", initialMessage: "", placeholder: "" };
    await controller.upsertConfig("t1", body);

    expect(upsertConfig).toHaveBeenCalledWith("t1", body);
  });

  it("delegates upserting the agent config", async () => {
    const upsertAgentConfig = vi.fn().mockResolvedValue({ provider: "n8n" });
    const controller = new TenantsController(fakeService({ upsertAgentConfig }));

    const body = { provider: "n8n" as const, timeoutMs: 15000, retryPolicy: {} };
    await controller.upsertAgentConfig("t1", body);

    expect(upsertAgentConfig).toHaveBeenCalledWith("t1", body);
  });
});
