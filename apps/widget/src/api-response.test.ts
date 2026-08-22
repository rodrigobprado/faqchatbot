import { describe, expect, it } from "vitest";
import { unwrapEnvelope } from "./api-response.js";

describe("unwrapEnvelope", () => {
  it("returns the inner data when the payload uses the response envelope", () => {
    const payload = { data: { status: "ok" } };

    expect(unwrapEnvelope<{ status: string }>(payload)).toEqual({ status: "ok" });
  });

  it("returns the payload unchanged when there is no envelope", () => {
    const payload = { type: "typing" };

    expect(unwrapEnvelope(payload)).toEqual({ type: "typing" });
  });

  it("returns primitives unchanged", () => {
    expect(unwrapEnvelope<string>("ok")).toBe("ok");
  });
});
