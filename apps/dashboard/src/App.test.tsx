import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App", () => {
  it("renders the admin login shell before authentication", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Embeddable AI Platform");
    expect(html).toContain("Acesso administrativo");
    expect(html).toContain("Entre no painel");
  });
});
