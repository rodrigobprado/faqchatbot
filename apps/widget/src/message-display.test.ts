import { describe, expect, it } from "vitest";
import { describeMessageContent } from "./message-display.js";

describe("describeMessageContent", () => {
  it("extracts text from text and markdown messages", () => {
    expect(describeMessageContent({ type: "text", text: "Ola" })).toBe("Ola");
    expect(describeMessageContent({ type: "markdown", markdown: "**Ola**" })).toBe("**Ola**");
  });

  it("summarizes rich messages", () => {
    expect(
      describeMessageContent({
        type: "card",
        title: "Promo",
        description: "Descricao",
        buttons: []
      }),
    ).toBe("Promo — Descricao");

    expect(
      describeMessageContent({
        type: "quick_replies",
        text: "Escolha",
        replies: [{ id: "a", label: "A" }]
      }),
    ).toBe("Escolha");
  });

  it("renders tables as plain rows", () => {
    expect(
      describeMessageContent({
        type: "table",
        columns: ["A", "B"],
        rows: [["1", "2"]]
      }),
    ).toBe("A | B\n1 | 2");
  });

  it("falls back to the url for media without title", () => {
    expect(describeMessageContent({ type: "image", url: "https://x.com/i.png" })).toBe("https://x.com/i.png");
  });

  it("truncates very long texts", () => {
    const long = "a".repeat(3000);

    expect(describeMessageContent({ type: "text", text: long })).toHaveLength(2003);
    expect(describeMessageContent({ type: "text", text: long }).endsWith("...")).toBe(true);
  });

  it("returns empty string for status content without text", () => {
    expect(describeMessageContent({ type: "typing" })).toBe("");
  });
});
