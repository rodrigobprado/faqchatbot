import { describe, expect, it, vi } from "vitest";

const { resolveTxt } = vi.hoisted(() => ({ resolveTxt: vi.fn() }));

vi.mock("node:dns/promises", () => ({ resolveTxt }));

const { buildVerificationRecordName, verifyDomainOwnership } = await import("./domain-verification.js");

describe("domain-verification", () => {
  it("builds the expected TXT record hostname", () => {
    expect(buildVerificationRecordName("example.com")).toBe("_faqchatbot-verify.example.com");
  });

  it("confirms ownership when the TXT record matches the token", async () => {
    resolveTxt.mockResolvedValueOnce([["abc123"]]);
    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(true);
    expect(resolveTxt).toHaveBeenCalledWith("_faqchatbot-verify.example.com");
  });

  it("rejects ownership when no TXT record matches the token", async () => {
    resolveTxt.mockResolvedValueOnce([["other-value"]]);
    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(false);
  });

  it("rejects ownership when DNS lookup fails", async () => {
    resolveTxt.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(verifyDomainOwnership("example.com", "abc123")).resolves.toBe(false);
  });
});
