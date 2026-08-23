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

  it("delegates fetching analytics with a parsed period", async () => {
    const getAnalytics = vi.fn().mockResolvedValue({ totalsByEventType: [] });
    const controller = new TenantsController(fakeService({ getAnalytics }));

    await controller.getAnalytics("t1", { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" });

    expect(getAnalytics).toHaveBeenCalledWith("t1", {
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-01-31T00:00:00.000Z")
    });
  });

  it("delegates fetching analytics with an open-ended period", async () => {
    const getAnalytics = vi.fn().mockResolvedValue({ totalsByEventType: [] });
    const controller = new TenantsController(fakeService({ getAnalytics }));

    await controller.getAnalytics("t1", {});

    expect(getAnalytics).toHaveBeenCalledWith("t1", { from: undefined, to: undefined });
  });

  it("delegates listing conversations with the pagination query", async () => {
    const listConversations = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listConversations }));

    await controller.listConversations("t1", { limit: 10, offset: 5 });

    expect(listConversations).toHaveBeenCalledWith("t1", { limit: 10, offset: 5 });
  });

  it("delegates listing sessions with the pagination query", async () => {
    const listSessions = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listSessions }));

    await controller.listSessions("t1", { limit: 10, offset: 5 });

    expect(listSessions).toHaveBeenCalledWith("t1", { limit: 10, offset: 5 });
  });

  it("delegates listing audit logs with the pagination query", async () => {
    const listAuditLogs = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listAuditLogs }));

    await controller.listAuditLogs("t1", { limit: 10, offset: 5 });

    expect(listAuditLogs).toHaveBeenCalledWith("t1", { limit: 10, offset: 5 });
  });

  it("delegates listing users", async () => {
    const listUsers = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listUsers }));

    await controller.listUsers("t1");

    expect(listUsers).toHaveBeenCalledWith("t1");
  });

  it("delegates creating a user", async () => {
    const createUser = vi.fn().mockResolvedValue({ id: "u1" });
    const controller = new TenantsController(fakeService({ createUser }));

    const body = { email: "a@b.com", password: "password123", roleSlugs: ["support"] };
    await controller.createUser("t1", body);

    expect(createUser).toHaveBeenCalledWith("t1", body);
  });

  it("delegates listing roles", async () => {
    const listRoles = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listRoles }));

    await controller.listRoles("t1");

    expect(listRoles).toHaveBeenCalledWith("t1");
  });

  it("delegates creating a role", async () => {
    const createRole = vi.fn().mockResolvedValue({ id: "r1" });
    const controller = new TenantsController(fakeService({ createRole }));

    const body = { slug: "support", name: "Support", permissionSlugs: ["tenants:read"] };
    await controller.createRole("t1", body);

    expect(createRole).toHaveBeenCalledWith("t1", body);
  });

  it("delegates listing plans", async () => {
    const listPlans = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listPlans }));

    await controller.listPlans();

    expect(listPlans).toHaveBeenCalled();
  });

  it("delegates tenant system logs", async () => {
    const listTenantSystemLogs = vi.fn().mockResolvedValue([]);
    const controller = new TenantsController(fakeService({ listTenantSystemLogs }));

    await controller.listSystemLogs("t1");

    expect(listTenantSystemLogs).toHaveBeenCalledWith("t1");
  });

  it("delegates conversation detail", async () => {
    const getConversationDetail = vi.fn().mockResolvedValue({ id: "c1" });
    const controller = new TenantsController(fakeService({ getConversationDetail }));

    await controller.getConversationDetail("t1", "c1");

    expect(getConversationDetail).toHaveBeenCalledWith("t1", "c1");
  });

  it("delegates api key listing, creation and revocation with actor id", async () => {
    const listApiKeys = vi.fn().mockResolvedValue([]);
    const createApiKey = vi.fn().mockResolvedValue({ id: "k1" });
    const revokeApiKey = vi.fn().mockResolvedValue({ id: "k1" });
    const controller = new TenantsController(fakeService({ listApiKeys, createApiKey, revokeApiKey }));
    const request = { user: { sub: "actor-1" } } as unknown as AuthenticatedAdminRequest;

    await controller.listApiKeys(request, "t1");
    await controller.createApiKey(request, "t1", { name: "Integracao" });
    await controller.revokeApiKey(request, "t1", "k1");

    expect(listApiKeys).toHaveBeenCalledWith("t1", "actor-1");
    expect(createApiKey).toHaveBeenCalledWith("t1", "Integracao", "actor-1");
    expect(revokeApiKey).toHaveBeenCalledWith("t1", "k1", "actor-1");
  });

  it("delegates user status and role updates with actor id", async () => {
    const updateUserStatus = vi.fn().mockResolvedValue({ id: "u1" });
    const updateUserRoles = vi.fn().mockResolvedValue({ id: "u1" });
    const controller = new TenantsController(fakeService({ updateUserStatus, updateUserRoles }));
    const request = { user: { sub: "actor-1" } } as unknown as AuthenticatedAdminRequest;

    await controller.updateUserStatus(request, "t1", "u1", { status: "suspended" });
    await controller.updateUserRoles(request, "t1", "u1", { roleSlugs: ["support"] });

    expect(updateUserStatus).toHaveBeenCalledWith("t1", "u1", "suspended", "actor-1");
    expect(updateUserRoles).toHaveBeenCalledWith("t1", "u1", ["support"], "actor-1");
  });
});
