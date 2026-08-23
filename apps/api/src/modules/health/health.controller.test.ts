import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { HealthController } from "./health.controller.js";

const buildDb = (execute: (query: unknown) => Promise<unknown>) =>
  ({ execute }) as unknown as Database;

describe("HealthController", () => {
  it("returns API health status when the database responds", async () => {
    const controller = new HealthController(buildDb(() => Promise.resolve([])));

    const response = await controller.getHealth();

    expect(response.status).toBe("ok");
    expect(response.service).toBe("api");
    expect(response.checks.database).toBe("ok");
    expect(Date.parse(response.timestamp)).not.toBeNaN();
  });

  it("returns 503 with database check failed when the query errors", async () => {
    const controller = new HealthController(buildDb(() => Promise.reject(new Error("down"))));

    await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);
  });
});
