import { describe, expect, it } from "vitest";
import { readWidgetConfig } from "./widget-config.js";

const createScript = (attributes: Record<string, string>) => {
  const script = document.createElement("script");
  for (const [name, value] of Object.entries(attributes)) {
    script.setAttribute(name, value);
  }
  return script;
};

describe("readWidgetConfig", () => {
  it("reads the agentId from the data-agent attribute", () => {
    const config = readWidgetConfig(createScript({ "data-agent": "acme" }), "https://api.default.com");

    expect(config.agentId).toBe("acme");
    expect(config.apiUrl).toBe("https://api.default.com");
  });

  it("overrides the default API URL with data-api-url when present", () => {
    const config = readWidgetConfig(
      createScript({ "data-agent": "acme", "data-api-url": "https://api.override.com" }),
      "https://api.default.com",
    );

    expect(config.apiUrl).toBe("https://api.override.com");
  });

  it("returns null agentId when the script tag is missing", () => {
    const config = readWidgetConfig(null, "https://api.default.com");

    expect(config.agentId).toBeNull();
  });

  it("returns null agentId when data-agent is absent", () => {
    const config = readWidgetConfig(createScript({}), "https://api.default.com");

    expect(config.agentId).toBeNull();
  });
});
