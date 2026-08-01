import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns API health status", async () => {
    const response = await new HealthController({
      ping: async () => undefined
    } as never).getHealth();

    expect(response.status).toBe("ok");
    expect(response.service).toBe("api");
    expect(response.checks.database).toBe("ok");
    expect(Date.parse(response.timestamp)).not.toBeNaN();
  });
});
