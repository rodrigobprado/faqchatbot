import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { PlatformLogger } from "@faqchatbot/logger";
import type { FastifyReply, FastifyRequest } from "fastify";

export type ErrorResponseBody = Readonly<{
  error: Readonly<{
    statusCode: number;
    message: string;
    correlationId: string;
  }>;
}>;

const extractMessage = (exception: HttpException): string => {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null && "message" in response) {
    const { message } = response as { message: unknown };
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }

  return exception.message;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PlatformLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const correlationId = String(request.id);

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException ? extractMessage(exception) : "Internal server error";

    this.logger.error("request_failed", {
      correlationId,
      statusCode,
      path: request.url,
      message: isHttpException ? message : String(exception)
    });

    const body: ErrorResponseBody = { error: { statusCode, message, correlationId } };

    reply.status(statusCode).send(body);
  }
}
