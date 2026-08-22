import { describe, expect, it, vi } from "vitest";
import type { TenantsService } from "./tenants.service.js";
import { SystemLogsController } from "./system-logs.controller.js";

describe("SystemLogsController", () => {
  it("delegates listing system logs with filters", async () => {
    const listSystemLogs = vi.fn().mockResolvedValue([{ id: "log-1", level: "error" }]);
    const controller = new SystemLogsController({ listSystemLogs } as unknown as TenantsService);

    const result = await controller.list({
      tenantId: "11111111-1111-1111-1111-111111111111",
      level: "error",
      limit: 25,
      offset: 0
    });

    expect(listSystemLogs).toHaveBeenCalledWith({
      tenantId: "11111111-1111-1111-1111-111111111111",
      level: "error",
      limit: 25,
      offset: 0
    });
    expect(result).toEqual([{ id: "log-1", level: "error" }]);
  });

  it("forwards an empty filter when no query is provided", async () => {
    const listSystemLogs = vi.fn().mockResolvedValue([]);
    const controller = new SystemLogsController({ listSystemLogs } as unknown as TenantsService);

    const result = await controller.list({});

    expect(listSystemLogs).toHaveBeenCalledWith({});
    expect(result).toEqual([]);
  });
});
