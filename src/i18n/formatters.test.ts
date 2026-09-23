import { describe, expect, it } from "vitest";
import { formatBrawlerResultCount } from "./brawlerBrowserMessages";
import { formatMapResultCount } from "./mapBrowserMessages";
import { formatMetaAllCandidates, formatMetaCandidateCount } from "./formatters";

describe("localized catalog counts", () => {
  it("uses the singular map form in each language", () => {
    expect(formatMapResultCount("ko", 1)).toBe("1개 맵");
    expect(formatMapResultCount("en", 1)).toBe("1 map");
    expect(formatMapResultCount("ja", 1)).toBe("1件のマップ");
    expect(formatMapResultCount("pt-br", 1)).toBe("1 mapa");
    expect(formatMapResultCount("es", 1)).toBe("1 mapa");
    expect(formatMapResultCount("tr", 1)).toBe("1 harita");
    expect(formatMapResultCount("de", 1)).toBe("1 Karte");
    expect(formatMapResultCount("fr", 1)).toBe("1 carte");
    expect(formatMapResultCount("it", 1)).toBe("1 mappa");
    expect(formatMapResultCount("ru", 1)).toBe("1 карта");
  });

  it("handles zero and Russian count forms", () => {
    expect(formatMapResultCount("fr", 0)).toBe("0 cartes");
    expect(formatMapResultCount("es", 2)).toBe("2 mapas");
    expect(formatMapResultCount("ru", 2)).toBe("2 карты");
    expect(formatMapResultCount("ru", 5)).toBe("5 карт");
    expect(formatMapResultCount("ru", 21)).toBe("21 карта");
    expect(formatBrawlerResultCount("en", 1)).toBe("1 brawler");
    expect(formatBrawlerResultCount("ru", 1)).toBe("1 боец");
    expect(formatBrawlerResultCount("ru", 2)).toBe("2 бойца");
    expect(formatBrawlerResultCount("ru", 5)).toBe("5 бойцов");
    expect(formatMetaCandidateCount("es", 1)).toBe("1 brawler");
    expect(formatMetaAllCandidates("it", 1)).toBe("1 brawler totale");
  });
});
