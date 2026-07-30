import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns API health status", () => {
    const response = new HealthController().getHealth();

    expect(response.status).toBe("ok");
    expect(response.service).toBe("api");
    expect(Date.parse(response.timestamp)).not.toBeNaN();
  });
});

