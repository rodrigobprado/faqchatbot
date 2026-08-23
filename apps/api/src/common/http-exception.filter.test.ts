import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import type { PlatformLogger } from "@faqchatbot/logger";
import { describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "./http-exception.filter.js";

const createLoggerStub = (): PlatformLogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

const createHost = (request: { id: string; url: string }, reply: { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> }) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply
    })
  }) as unknown as ArgumentsHost;

describe("HttpExceptionFilter", () => {
  it("formats HttpException as a standard error envelope with the request correlation id", () => {
    const logger = createLoggerStub();
    const filter = new HttpExceptionFilter(logger);
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const reply = { status, send };
    const request = { id: "corr-1", url: "/v1/admin/tenants" };

    filter.catch(new HttpException("Tenant not found", HttpStatus.NOT_FOUND), createHost(request, reply));

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith({
      error: { statusCode: 404, message: "Tenant not found", correlationId: "corr-1" }
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("hides internal error details behind a generic message for unknown exceptions", () => {
    const logger = createLoggerStub();
    const filter = new HttpExceptionFilter(logger);
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const reply = { status, send };
    const request = { id: "corr-2", url: "/v1/chat/messages" };

    filter.catch(new Error("password=hunter2 leaked from db driver"), createHost(request, reply));

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({
      error: { statusCode: 500, message: "Internal server error", correlationId: "corr-2" }
    });
  });

  it("extracts the class-validator message array from a Bad Request response body", () => {
    const logger = createLoggerStub();
    const filter = new HttpExceptionFilter(logger);
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const reply = { status, send };
    const request = { id: "corr-3", url: "/v1/auth/login" };

    filter.catch(
      new HttpException(
        { message: ["email must be an email"], error: "Bad Request", statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      ),
      createHost(request, reply),
    );

    expect(send).toHaveBeenCalledWith({
      error: { statusCode: 400, message: "email must be an email", correlationId: "corr-3" }
    });
  });
});
