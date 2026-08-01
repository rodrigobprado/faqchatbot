export type WidgetScriptOptions = Readonly<{
  src: string;
  agentId: string;
  async?: boolean;
  nonce?: string;
  attributes?: Readonly<Record<string, string>>;
}>;

const escapeAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const buildWidgetScriptUrl = (options: Pick<WidgetScriptOptions, "src" | "agentId">): string => {
  const url = new URL(options.src);
  url.searchParams.set("data-agent", options.agentId);
  return url.toString();
};

export const buildWidgetSnippet = (options: WidgetScriptOptions): string => {
  const url = buildWidgetScriptUrl(options);
  const attributes = [
    `src="${escapeAttribute(url)}"`,
    `data-agent="${escapeAttribute(options.agentId)}"`
  ];

  if (options.async !== false) {
    attributes.push("async");
  }

  if (options.nonce) {
    attributes.push(`nonce="${escapeAttribute(options.nonce)}"`);
  }

  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    attributes.push(`${escapeAttribute(name)}="${escapeAttribute(value)}"`);
  }

  return `<script ${attributes.join(" ")}></script>`;
};
