import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";

describe("AuthController", () => {
  it("delegates login to AuthService with the request credentials", async () => {
    const login = vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", expiresInSeconds: 900 });
    const controller = new AuthController({ login } as unknown as AuthService);

    const result = await controller.login({ email: "admin@example.com", password: "correct horse battery" });

    expect(login).toHaveBeenCalledWith("admin@example.com", "correct horse battery");
    expect(result.accessToken).toBe("a");
  });

  it("delegates refresh to AuthService with the refresh token", async () => {
    const refresh = vi.fn().mockResolvedValue({ accessToken: "new-a", expiresInSeconds: 900 });
    const controller = new AuthController({ refresh } as unknown as AuthService);

    const result = await controller.refresh({ refreshToken: "refresh-token" });

    expect(refresh).toHaveBeenCalledWith("refresh-token");
    expect(result.accessToken).toBe("new-a");
  });
});
