import { resolveTxt } from "node:dns/promises";
import { buildDomainVerificationRecordName } from "@faqchatbot/contracts";

export const buildVerificationRecordName = buildDomainVerificationRecordName;

export const verifyDomainOwnership = async (domain: string, token: string): Promise<boolean> => {
  try {
    const records = await resolveTxt(buildVerificationRecordName(domain));
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
};
