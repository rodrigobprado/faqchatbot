import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs";

export type EnvelopedResponse<T> = Readonly<{ data: T }>;

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, EnvelopedResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<EnvelopedResponse<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
