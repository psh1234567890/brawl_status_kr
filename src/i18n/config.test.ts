import { describe, expect, it } from "vitest";
import { localeAlternates, localizedHref, stripLocalePrefix } from "./config";

describe("i18n route helpers", () => {
  it("prefixes only translated core routes", () => {
    expect(localizedHref("en", "/meta")).toBe("/en/meta");
    expect(localizedHref("ja", "/teams")).toBe("/ja/teams");
    expect(localizedHref("ko", "/meta")).toBe("/meta");
    expect(localizedHref("en", "/skins")).toBe("/skins");
  });

  it("strips English and Japanese locale prefixes", () => {
    expect(stripLocalePrefix("/en/meta")).toBe("/meta");
    expect(stripLocalePrefix("/ja")).toBe("/");
    expect(stripLocalePrefix("/maps")).toBe("/maps");
  });

  it("builds hreflang alternatives for a core route", () => {
    expect(localeAlternates("/counters")).toEqual({
      "ko-KR": "/counters",
      en: "/en/counters",
      ja: "/ja/counters",
    });
  });
});
