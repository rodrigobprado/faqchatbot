import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { map, type Observable } from "rxjs";

type Envelope<T> = Readonly<{
  data: T;
  meta: Readonly<{
    correlationId: string;
  }>;
}>;

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Envelope<unknown>> {
    const request = context.switchToHttp().getRequest<{
      correlationId?: string;
      id?: string;
    }>();
    const correlationId =
      typeof request.correlationId === "string" && request.correlationId.trim()
        ? request.correlationId
        : typeof request.id === "string" && request.id.trim()
          ? request.id
          : "unknown";

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          correlationId
        }
      })),
    );
  }
}
