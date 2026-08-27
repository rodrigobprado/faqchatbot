import { buildDomainVerificationRecordName } from "@faqchatbot/contracts";

export const buildVerificationRecordName = buildDomainVerificationRecordName;

const DOH_TXT_QUERY_URL = "https://cloudflare-dns.com/dns-query";
const DNS_RECORD_TYPE_TXT = 16;

type DohAnswer = Readonly<{ type: number; data: string }>;
type DohResponse = Readonly<{ Status: number; Answer?: DohAnswer[] }>;

// ponytail: relies on Cloudflare's public resolver instead of the host's own
// DNS resolver, which can hold a stale negative-cache entry from before the
// TXT record existed. Upgrade to a multi-resolver check if this ever proves
// insufficient.
export const verifyDomainOwnership = async (domain: string, token: string): Promise<boolean> => {
  try {
    const hostname = buildVerificationRecordName(domain);
    const response = await fetch(
      `${DOH_TXT_QUERY_URL}?name=${encodeURIComponent(hostname)}&type=TXT`,
      { headers: { accept: "application/dns-json" } },
    );

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as DohResponse;

    return (body.Answer ?? [])
      .filter((answer) => answer.type === DNS_RECORD_TYPE_TXT)
      .some((answer) => answer.data.replace(/^"|"$/g, "") === token);
  } catch {
    return false;
  }
};
