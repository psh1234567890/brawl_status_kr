import { describe, expect, it } from "vitest";
import {
  translateAbilityName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateMapName,
  translateModeName,
  translateSkinName,
} from "./brawlTranslations";

describe("localized Brawl game names", () => {
  it("keeps canonical English names for English", () => {
    expect(translateBrawlerName("SHELLY", "en")).toBe("Shelly");
    expect(translateMapName("Backyard Bowl", "en")).toBe("Backyard Bowl");
    expect(translateModeName("brawlBall", "en")).toBe("Brawl Ball");
  });

  it("uses official Japanese localization data when available", () => {
    expect(translateBrawlerName("SHELLY", "ja")).toBe("シェリー");
    expect(translateMapName("Backyard Bowl", "ja")).toBe("鉄壁の護り");
    expect(translateModeName("brawlBall", "ja")).toBe("ブロストライカー");
  });

  it("uses official additional localization data", () => {
    expect(translateMapName("Backyard Bowl", "pt-br")).toBe("Bocha");
    expect(translateModeName("brawlBall", "es")).toBe("Balón Brawl");
    expect(translateModeName("brawlBall", "tr")).toBe("Savaş Topu");
    expect(translateMapName("Backyard Bowl", "de")).toBe("Hinterhofstadion");
    expect(translateMapName("Backyard Bowl", "fr")).toBe("Ligue junior");
    expect(translateMapName("Backyard Bowl", "it")).toBe("Campetto");
    expect(translateBrawlerName("SHELLY", "ru")).toBe("Шелли");
  });

  it("uses official descriptions, abilities, and skins for catalog pages", () => {
    const fallback = "fallback description";
    expect(translateBrawlerDescription("SHELLY", fallback, "es")).not.toBe(fallback);
    expect(translateAbilityName(23000076, "SHELL SHOCK", "ja")).toBe("シェルショック");
    expect(translateSkinName(29000002, "Rockstar Colt", "en")).toBe("Rockstar Colt");
    expect(translateSkinName(29000002, "Rockstar Colt", "ru")).toBe("Рок-Звезда Кольт");
  });
});
