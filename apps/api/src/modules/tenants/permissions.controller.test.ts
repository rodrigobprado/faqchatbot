import { describe, expect, it, vi } from "vitest";
import type { TenantsService } from "./tenants.service.js";
import { PermissionsController } from "./permissions.controller.js";

describe("PermissionsController", () => {
  it("delegates listing permissions", async () => {
    const listPermissions = vi.fn().mockResolvedValue([{ id: "p1", slug: "tenants:read" }]);
    const controller = new PermissionsController({ listPermissions } as unknown as TenantsService);

    const result = await controller.list();

    expect(listPermissions).toHaveBeenCalled();
    expect(result).toEqual([{ id: "p1", slug: "tenants:read" }]);
  });
});
