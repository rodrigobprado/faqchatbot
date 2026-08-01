import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "./http-exception.filter.js";

describe("HttpExceptionFilter", () => {
  it("formats HTTP exceptions without leaking stack traces", () => {
    const status = vi.fn().mockReturnValue({ send: vi.fn() });
    const send = vi.fn();
    status.mockReturnValue({ send });

    const filter = new HttpExceptionFilter();

    filter.catch(
      new BadRequestException("Invalid widget session payload"),
      {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            id: "corr-123"
          }),
          getResponse: () => ({
            status
          })
        })
      } as never,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid widget session payload",
        correlationId: "corr-123"
      }
    });
  });
});
