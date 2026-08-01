import { describe, expect, it } from "vitest";
import { lastValueFrom, of } from "rxjs";
import { ResponseEnvelopeInterceptor } from "./response-envelope.interceptor.js";

describe("ResponseEnvelopeInterceptor", () => {
  it("wraps controller responses in a standard envelope", async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const response = await lastValueFrom(
      interceptor.intercept(
        {
          switchToHttp: () => ({
            getRequest: () => ({
              correlationId: "corr-123"
            })
          })
        } as never,
        {
          handle: () => of({ ok: true })
        } as never,
      ),
    );

    expect(response).toEqual({
      data: { ok: true },
      meta: { correlationId: "corr-123" }
    });
  });
});
