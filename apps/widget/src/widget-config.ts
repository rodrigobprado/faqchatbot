export type WidgetConfig = {
  agentId: string | null;
  apiUrl: string;
};

// The script's own src is always the correct public origin: the visitor's
// browser just fetched it from there, regardless of how the embedding site's
// backend is configured internally (localhost behind a reverse proxy, a
// different build-time origin, etc). Prefer it over the build-time default,
// which only exists as a last resort when the script element is unavailable.
const deriveOriginFromScriptSrc = (src: string | undefined): string | null => {
  if (!src) {
    return null;
  }

  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
};

export const readWidgetConfig = (
  scriptEl: HTMLScriptElement | null,
  defaultApiUrl: string,
): WidgetConfig => ({
  agentId: scriptEl?.getAttribute("data-agent") ?? null,
  apiUrl:
    scriptEl?.getAttribute("data-api-url") ??
    deriveOriginFromScriptSrc(scriptEl?.src) ??
    defaultApiUrl
});
