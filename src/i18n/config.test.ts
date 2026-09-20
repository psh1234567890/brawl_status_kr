import { describe, expect, it } from "vitest";
import { localeAlternates, localizedHref, stripLocalePrefix } from "./config";

describe("i18n route helpers", () => {
  it("prefixes only translated core routes", () => {
    expect(localizedHref("en", "/meta")).toBe("/en/meta");
    expect(localizedHref("ja", "/teams")).toBe("/ja/teams");
    expect(localizedHref("pt-br", "/counters")).toBe("/pt-br/counters");
    expect(localizedHref("es", "/rankings")).toBe("/es/rankings");
    expect(localizedHref("ko", "/meta")).toBe("/meta");
    expect(localizedHref("en", "/skins")).toBe("/skins");
  });

  it("strips supported locale prefixes", () => {
    expect(stripLocalePrefix("/en/meta")).toBe("/meta");
    expect(stripLocalePrefix("/ja")).toBe("/");
    expect(stripLocalePrefix("/pt-br/meta")).toBe("/meta");
    expect(stripLocalePrefix("/ru/teams")).toBe("/teams");
    expect(stripLocalePrefix("/maps")).toBe("/maps");
  });

  it("builds hreflang alternatives for a core route", () => {
    expect(localeAlternates("/counters")).toMatchObject({
      "ko-KR": "/counters",
      en: "/en/counters",
      ja: "/ja/counters",
      "pt-BR": "/pt-br/counters",
      es: "/es/counters",
      tr: "/tr/counters",
      de: "/de/counters",
      fr: "/fr/counters",
      it: "/it/counters",
      ru: "/ru/counters",
    });
  });
});
