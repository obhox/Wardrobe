import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, toThemeId } from "../theme";
import { toLayoutMode } from "../layout";

describe("toThemeId", () => {
  it("passes current themes through", () => {
    for (const t of THEMES) expect(toThemeId(t.id)).toBe(t.id);
  });

  // the same mapping the curated_themes migration uses to fill Wardrobe.theme
  it.each([
    ["daylight", "mist"],
    ["bubblegum", "rose"],
    ["slate", "ink"],
  ])("maps the old %s ground to %s", (ground, theme) => {
    expect(toThemeId(ground)).toBe(theme);
  });

  it("falls back to the default for anything else", () => {
    expect(toThemeId("#c9b8e8")).toBe(DEFAULT_THEME);
    expect(toThemeId("")).toBe(DEFAULT_THEME);
    expect(toThemeId(null)).toBe(DEFAULT_THEME);
  });
});

describe("toLayoutMode", () => {
  it("keeps the collage and the board", () => {
    expect(toLayoutMode("free")).toBe("free");
    expect(toLayoutMode("grid")).toBe("grid");
  });

  it("reads removed layouts as the board", () => {
    for (const old of ["gallery", "shelves", "columns", undefined]) expect(toLayoutMode(old)).toBe("grid");
  });
});
