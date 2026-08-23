import type { PageContext } from "@faqchatbot/contracts";

const extractUtm = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};

  for (const [key, value] of params) {
    if (key.startsWith("utm_")) {
      utm[key] = value;
    }
  }

  return utm;
};

export const collectPageContext = (): PageContext => ({
  url: window.location.href,
  title: document.title,
  language: navigator.language,
  referrer: document.referrer,
  utm: extractUtm(window.location.search),
  viewport: { width: window.innerWidth, height: window.innerHeight },
  userAgent: navigator.userAgent,
  currentPage: window.location.pathname + window.location.search,
  timestamp: new Date().toISOString()
});
