export type WidgetConfig = {
  agentId: string | null;
  apiUrl: string;
};

export const readWidgetConfig = (
  scriptEl: HTMLScriptElement | null,
  defaultApiUrl: string,
): WidgetConfig => ({
  agentId: scriptEl?.getAttribute("data-agent") ?? null,
  apiUrl: scriptEl?.getAttribute("data-api-url") ?? defaultApiUrl
});
