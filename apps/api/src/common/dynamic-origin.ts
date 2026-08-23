import { createLogger } from "@faqchatbot/logger";

export type CorsOriginCallback = (error: Error | null, allow: boolean) => void;

export const normalizeOriginHost = (origin: string): string | null => {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
};

export const buildCorsOriginValidator = (
  listAllowedHostnames: () => Promise<readonly string[]>,
  extraOrigins: readonly string[] = [],
  cacheTtlMs = 30_000,
) => {
  const logger = createLogger("cors");
  const extraHosts = new Set(
    extraOrigins.map((origin) => normalizeOriginHost(origin)).filter((host): host is string => host !== null),
  );
  let cache: { hosts: ReadonlySet<string>; expiresAt: number } | null = null;
  let inFlight: Promise<ReadonlySet<string>> | null = null;

  const loadAllowedHosts = async (): Promise<ReadonlySet<string>> => {
    if (cache && cache.expiresAt > Date.now()) {
      return cache.hosts;
    }

    if (!inFlight) {
      inFlight = listAllowedHostnames()
        .then((domains) => {
          const hosts = new Set([...domains, ...extraHosts]);
          cache = { hosts, expiresAt: Date.now() + cacheTtlMs };
          return hosts as ReadonlySet<string>;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    return inFlight;
  };

  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const requestHost = normalizeOriginHost(origin);
    if (requestHost === null) {
      callback(null, false);
      return;
    }

    void loadAllowedHosts()
      .then((hosts) => {
        callback(null, hosts.has(requestHost));
      })
      .catch((error: unknown) => {
        logger.warn("cors_origin_lookup_failed", {
          reason: error instanceof Error ? error.message : "unknown"
        });
        callback(null, false);
      });
  };
};
