import { describe, expect, it } from "vitest";
import { collectPageContext } from "./page-context.js";

describe("collectPageContext", () => {
  it("collects url, title, language, viewport and timestamp", () => {
    const context = collectPageContext();

    expect(context.url).toBe(window.location.href);
    expect(context.title).toBe(document.title);
    expect(context.language).toBe(navigator.language);
    expect(context.viewport).toEqual({ width: window.innerWidth, height: window.innerHeight });
    expect(context.userAgent).toBe(navigator.userAgent);
    expect(() => new Date(context.timestamp).toISOString()).not.toThrow();
  });

  it("extracts utm parameters from the current URL", () => {
    window.history.pushState({}, "", "/pricing?utm_source=google&utm_medium=cpc&other=1");

    const context = collectPageContext();

    expect(context.utm).toEqual({ utm_source: "google", utm_medium: "cpc" });
    expect(context.currentPage).toBe("/pricing?utm_source=google&utm_medium=cpc&other=1");
  });

  it("returns an empty utm object when there are no utm parameters", () => {
    window.history.pushState({}, "", "/");

    const context = collectPageContext();

    expect(context.utm).toEqual({});
  });
});
