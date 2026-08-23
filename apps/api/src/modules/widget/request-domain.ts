export const extractRequestDomain = (origin?: string, referer?: string): string | null => {
  for (const candidate of [origin, referer]) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate).hostname;
    } catch {
      continue;
    }
  }

  return null;
};
