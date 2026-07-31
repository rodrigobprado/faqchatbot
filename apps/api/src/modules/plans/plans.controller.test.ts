import { describe, expect, it, vi } from "vitest";
import type { PlansService } from "./plans.service.js";
import { PlansController } from "./plans.controller.js";

const fakeService = (overrides: Partial<Record<keyof PlansService, ReturnType<typeof vi.fn>>>) =>
  overrides as unknown as PlansService;

describe("PlansController", () => {
  it("delegates plan creation", async () => {
    const create = vi.fn().mockResolvedValue({ id: "p1" });
    const controller = new PlansController(fakeService({ create }));

    const body = { slug: "starter", name: "Starter" };
    await controller.create(body);

    expect(create).toHaveBeenCalledWith(body);
  });

  it("delegates listing plans", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const controller = new PlansController(fakeService({ list }));

    await controller.list();

    expect(list).toHaveBeenCalled();
  });

  it("delegates fetching a plan", async () => {
    const get = vi.fn().mockResolvedValue({ id: "p1" });
    const controller = new PlansController(fakeService({ get }));

    await controller.get("p1");

    expect(get).toHaveBeenCalledWith("p1");
  });

  it("delegates plan update", async () => {
    const update = vi.fn().mockResolvedValue({ id: "p1" });
    const controller = new PlansController(fakeService({ update }));

    const body = { name: "Starter Plus" };
    await controller.update("p1", body);

    expect(update).toHaveBeenCalledWith("p1", body);
  });
});
