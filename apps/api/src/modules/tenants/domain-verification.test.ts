import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildVerificationRecordName, verifyDomainOwnership } from "./domain-verification.js";

const dohResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("domain-verification", () => {
  it("builds the expected TXT record hostname", () => {
    expect(buildVerificationRecordName("example.com")).toBe("_faqchatbot-verify.example.com");
  });

  it("confirms ownership when the TXT record matches the token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      dohResponse({ Status: 0, Answer: [{ type: 16, data: '"abc123"' }] }),
    );

    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("name=_faqchatbot-verify.example.com"),
      expect.objectContaining({ headers: { accept: "application/dns-json" } }),
    );
  });

  it("rejects ownership when no TXT record matches the token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      dohResponse({ Status: 0, Answer: [{ type: 16, data: '"other-value"' }] }),
    );

    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(false);
  });

  it("rejects ownership when there is no TXT record at all", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(dohResponse({ Status: 3 }));

    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(false);
  });

  it("rejects ownership when the DoH lookup fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));

    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(false);
  });
});
