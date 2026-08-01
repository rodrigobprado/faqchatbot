const normalizeOrigin = (origin: string): string | null => {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const parseAllowList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeOrigin(item) ?? item);

const isLocalhostOrigin = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  try {
    const hostname = new URL(normalizedOrigin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
};

export const createCorsOriginResolver = (allowListValue: string | undefined) => {
  const allowList = parseAllowList(allowListValue);

  return async (origin: string | undefined): Promise<boolean | string> => {
    if (!origin) {
      return true;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
      return false;
    }

    if (allowList.length > 0) {
      return allowList.includes(normalizedOrigin) || allowList.includes(origin) ? origin : false;
    }

    return isLocalhostOrigin(origin) ? origin : false;
  };
};
