import { describe, expect, it } from "vitest";
import { absoluteUrl, clip, extractUrl, isUnreadableShop, looseUrl, shopName, titleFromUrl } from "../links";

describe("extractUrl", () => {
  it("pulls the link out of share-sheet text", () => {
    expect(extractUrl("Check out this item on Temu! https://share.temu.com/abc.")).toBe(
      "https://share.temu.com/abc"
    );
  });

  it("returns null when there is no link", () => {
    expect(extractUrl("no link here")).toBeNull();
  });
});

describe("isUnreadableShop", () => {
  it.each([
    "https://www.aliexpress.com/item/1.html",
    "https://www.aliexpress.us/item/1.html",
    "https://temu.com/x",
    "https://share.temu.com/x",
  ])("flags %s", (url) => {
    expect(isUnreadableShop(url)).toBe(true);
  });

  it("does not flag other shops or lookalike hosts", () => {
    expect(isUnreadableShop("https://example.com/x")).toBe(false);
    expect(isUnreadableShop("https://nottemu.com/x")).toBe(false);
    expect(isUnreadableShop("not a url")).toBe(false);
  });
});

describe("shopName", () => {
  it("names the shops the form has special copy for", () => {
    expect(shopName("https://www.aliexpress.com/item/1.html")).toBe("aliexpress");
    expect(shopName("https://www.temu.com/x")).toBe("temu");
    expect(shopName("https://example.com/x")).toBeNull();
  });
});

describe("titleFromUrl", () => {
  it("turns a product slug into a name, dropping ids", () => {
    expect(titleFromUrl("https://www.temu.com/womens-casual-linen-dress-g-601099512399871.html")).toBe(
      "womens casual linen dress"
    );
  });

  it("returns nothing when no path segment reads as words", () => {
    expect(titleFromUrl("https://shop.com/p/12345")).toBeUndefined();
    expect(titleFromUrl("not a url")).toBeUndefined();
  });
});

describe("absoluteUrl", () => {
  const base = "https://shop.com/p/1";

  it("resolves protocol-relative and relative paths", () => {
    expect(absoluteUrl("//cdn.shop.com/a.jpg", base)).toBe("https://cdn.shop.com/a.jpg");
    expect(absoluteUrl("/img/a.png", base)).toBe("https://shop.com/img/a.png");
  });

  it("rejects non-http schemes and empty input", () => {
    expect(absoluteUrl("javascript:alert(1)", base)).toBeUndefined();
    expect(absoluteUrl(undefined, base)).toBeUndefined();
  });
});

describe("looseUrl", () => {
  it("normalises what people paste", () => {
    expect(looseUrl("  ")).toBeNull();
    expect(looseUrl("//cdn.shop.com/a.jpg")).toBe("https://cdn.shop.com/a.jpg");
    expect(looseUrl("see https://a.com/x!")).toBe("https://a.com/x");
    expect(looseUrl("just words")).toBeNull();
  });

  it("passes uploaded photos and non-strings through", () => {
    expect(looseUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(looseUrl(5)).toBe(5);
  });
});

describe("clip", () => {
  it("trims and cuts long strings, leaving other values alone", () => {
    expect(clip(5)("  abcdefg ")).toBe("abcde");
    expect(clip(5)(null)).toBeNull();
  });
});
