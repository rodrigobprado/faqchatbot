import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

type ErrorResponse = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
    correlationId: string;
  }>;
}>;

const statusToCode = (status: number): string => {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "UNPROCESSABLE_ENTITY";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
};

const getCorrelationId = (request: FastifyRequest): string => {
  const requestCorrelationId = (request as FastifyRequest & { correlationId?: string }).correlationId;
  if (typeof requestCorrelationId === "string" && requestCorrelationId.trim()) {
    return requestCorrelationId;
  }

  const headerId = request.headers["x-correlation-id"];
  if (typeof headerId === "string" && headerId.trim()) {
    return headerId;
  }

  return typeof request.id === "string" && request.id.trim() ? request.id : "unknown";
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpHost = host.switchToHttp();
    const response = httpHost.getResponse<FastifyReply>();
    const request = httpHost.getRequest<FastifyRequest>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";
    const message =
      typeof payload === "string"
        ? payload
        : Array.isArray((payload as { message?: unknown }).message)
          ? (payload as { message?: unknown[] }).message?.join(", ") ?? "Request failed"
          : typeof (payload as { message?: unknown }).message === "string"
            ? ((payload as { message?: string }).message ?? "Request failed")
            : "Request failed";

    const body: ErrorResponse = {
      error: {
        code: statusToCode(status),
        message,
        correlationId: getCorrelationId(request)
      }
    };

    void response.status(status).send(body);
  }
}
