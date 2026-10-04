import { describe, expect, it } from "vitest";
import {
  currencyFromHost,
  currencyFromText,
  extractPrice,
  normalizeCurrency,
  parseAmount,
} from "../scrape-price";

describe("parseAmount", () => {
  it.each([
    ["25,000", 25000],
    ["19,99", 19.99],
    ["1.299,00", 1299],
    ["1 299,99", 1299.99],
    ["₦25,000.50", 25000.5],
    ["1.299.000", 1299000],
    ["$40", 40],
    [19.99, 19.99],
  ])("reads %j as %d", (raw, want) => {
    expect(parseAmount(raw)).toBe(want);
  });

  it("returns nothing when there is no number", () => {
    expect(parseAmount("free")).toBeUndefined();
    expect(parseAmount(null)).toBeUndefined();
    expect(parseAmount(Number.NaN)).toBeUndefined();
  });
});

describe("normalizeCurrency", () => {
  it("accepts ISO codes in any case", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
  });

  it("maps symbols to ISO codes", () => {
    expect(normalizeCurrency("₦")).toBe("NGN");
    expect(normalizeCurrency("CN¥")).toBe("CNY");
  });

  it("rejects empty and non-string values", () => {
    expect(normalizeCurrency("")).toBeUndefined();
    expect(normalizeCurrency(5)).toBeUndefined();
  });
});

describe("currencyFromText", () => {
  it.each([
    ["₦ 25,000", "NGN"],
    ["25,00 €", "EUR"],
    ["USD 20", "USD"],
    ["CN¥ 300", "CNY"],
  ])("finds the currency in %j", (text, want) => {
    expect(currencyFromText(text)).toBe(want);
  });

  it("returns nothing for a bare number", () => {
    expect(currencyFromText("300")).toBeUndefined();
  });
});

describe("currencyFromHost", () => {
  it("reads the currency from the shop's domain", () => {
    expect(currencyFromHost("https://shop.co.uk/x")).toBe("GBP");
    expect(currencyFromHost("https://www.jumia.com.ng/p")).toBe("NGN");
  });

  it("returns nothing for generic domains and non-URLs", () => {
    expect(currencyFromHost("https://shop.com/x")).toBeUndefined();
    expect(currencyFromHost("not a url")).toBeUndefined();
  });
});

describe("extractPrice", () => {
  const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

  it("reads price and currency from a JSON-LD offer", () => {
    const html = ld({ "@type": "Product", offers: { price: "129.00", priceCurrency: "EUR" } });
    expect(extractPrice(html, "https://shop.com/p")).toEqual({ price: 129, currency: "EUR" });
  });

  it("carries the currency down from an AggregateOffer", () => {
    const html = ld({
      "@type": "Product",
      offers: { "@type": "AggregateOffer", priceCurrency: "GBP", offers: [{ price: "45" }] },
    });
    expect(extractPrice(html, "https://shop.com/p")).toEqual({ price: 45, currency: "GBP" });
  });

  it("skips a malformed JSON-LD block and falls back to meta tags", () => {
    const html =
      `<script type="application/ld+json">{ not json</script>` +
      `<meta property="product:price:amount" content="59.90">` +
      `<meta property="product:price:currency" content="USD">`;
    expect(extractPrice(html, "https://shop.com/p")).toEqual({ price: 59.9, currency: "USD" });
  });

  it("reads the visible price and the symbol printed beside it", () => {
    const html = `<span class="price">₦ 25,000</span>`;
    expect(extractPrice(html, "https://shop.com/p")).toEqual({ price: 25000, currency: "NGN" });
  });

  it("treats a bare $ on a Canadian shop as CAD", () => {
    const html = `<span class="price">$40</span>`;
    expect(extractPrice(html, "https://shop.ca/p")).toEqual({ price: 40, currency: "CAD" });
  });

  it("keeps a price the caller already found", () => {
    expect(extractPrice("", "https://shop.com/p", { price: 10, currency: "usd" })).toEqual({
      price: 10,
      currency: "USD",
    });
  });

  it("falls back to the shop's domain for the currency", () => {
    const html = `<span class="price">4500</span>`;
    expect(extractPrice(html, "https://shop.ng/p")).toEqual({ price: 4500, currency: "NGN" });
  });
});
