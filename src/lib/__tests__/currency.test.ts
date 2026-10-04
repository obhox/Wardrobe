import { describe, expect, it } from "vitest";
import { currencySymbol, formatMoney, isPresetCurrency } from "../currency";

// Grouping and decimal marks follow the machine's locale, so these check the
// parts the code decides (symbol, spacing) rather than a full formatted string.

describe("isPresetCurrency", () => {
  it("knows the picker's currencies", () => {
    expect(isPresetCurrency("NGN")).toBe(true);
    expect(isPresetCurrency("ZAR")).toBe(false);
    expect(isPresetCurrency(null)).toBe(false);
  });
});

describe("currencySymbol", () => {
  it("uses our own symbol for presets", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("CNY")).toBe("CN¥");
  });

  it("defaults to the dollar", () => {
    expect(currencySymbol(null)).toBe("$");
  });

  it("returns a free-text symbol as it is", () => {
    expect(currencySymbol("KSh")).toBe("KSh");
  });
});

describe("formatMoney", () => {
  it("returns null when there is no price", () => {
    expect(formatMoney(null, "USD")).toBeNull();
    expect(formatMoney(undefined)).toBeNull();
  });

  it("keeps yuan and yen apart", () => {
    expect(formatMoney(10, "CNY")).toContain("CN¥");
    expect(formatMoney(10, "JPY")).toContain("¥");
    expect(formatMoney(10, "JPY")).not.toContain("CN");
  });

  it("puts a space after a word-like custom symbol but not after a short one", () => {
    expect(formatMoney(5, "KSh")).toBe("KSh 5");
    expect(formatMoney(5, "R")).toBe("R5");
  });
});
