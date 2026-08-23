import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { ResponseEnvelopeInterceptor } from "./response-envelope.interceptor.js";

describe("ResponseEnvelopeInterceptor", () => {
  it("wraps the handler payload inside a data field", async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const handler: CallHandler = { handle: () => of({ status: "ok" }) };

    const result$ = interceptor.intercept({} as ExecutionContext, handler);

    await expect(firstValueFrom(result$)).resolves.toEqual({ data: { status: "ok" } });
  });
});
