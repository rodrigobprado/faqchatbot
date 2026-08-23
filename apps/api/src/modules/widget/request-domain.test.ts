import { describe, expect, it } from "vitest";
import { extractRequestDomain } from "./request-domain.js";

describe("extractRequestDomain", () => {
  it("extracts the hostname from the Origin header", () => {
    expect(extractRequestDomain("https://acme.example.com", undefined)).toBe("acme.example.com");
  });

  it("strips the port from the Origin header", () => {
    expect(extractRequestDomain("http://localhost:5173", undefined)).toBe("localhost");
  });

  it("falls back to the Referer header when Origin is missing", () => {
    expect(extractRequestDomain(undefined, "https://acme.example.com/pricing")).toBe("acme.example.com");
  });

  it("returns null when both headers are missing", () => {
    expect(extractRequestDomain(undefined, undefined)).toBeNull();
  });

  it("returns null when both headers are malformed", () => {
    expect(extractRequestDomain("not-a-url", "also-not-a-url")).toBeNull();
  });

  it("prefers Origin over Referer when both are present", () => {
    expect(extractRequestDomain("https://acme.example.com", "https://evil.example.org")).toBe(
      "acme.example.com",
    );
  });
});
