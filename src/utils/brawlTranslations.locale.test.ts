import { describe, expect, it } from "vitest";
import {
  translateAbilityName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateGearName,
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
    expect(translateBrawlerName("Cosmo", "ja")).toBe("コスモ");
  });

  it("uses official additional localization data", () => {
    expect(translateMapName("Backyard Bowl", "pt-br")).toBe("Bocha");
    expect(translateModeName("brawlBall", "es")).toBe("Balón Brawl");
    expect(translateModeName("brawlBall", "tr")).toBe("Savaş Topu");
    expect(translateMapName("Backyard Bowl", "de")).toBe("Hinterhofstadion");
    expect(translateMapName("Backyard Bowl", "fr")).toBe("Ligue junior");
    expect(translateMapName("Backyard Bowl", "it")).toBe("Campetto");
    expect(translateBrawlerName("SHELLY", "ru")).toBe("Шелли");
    expect(translateBrawlerName("Vince", "ko")).toBe("빈스");
    expect(translateBrawlerName("Wendy", "ko")).toBe("웬디");
    expect(translateBrawlerName("Nori", "ko")).toBe("노리");
  });

  it("matches Brawlify map capitalization and punctuation to official map names", () => {
    expect(translateMapName("Ring Of Fire", "ko")).toBe("불의 고리");
    expect(translateMapName("Ring Of Fire", "ja")).toBe("炎のリング");
    expect(translateMapName("Ring Of Fire", "pt-br")).toBe("Anel de fogo");
    expect(translateMapName("Ring Of Fire", "es")).toBe("Pista ardiente");
    expect(translateMapName("Ring Of Fire", "tr")).toBe("Ateşten Halka");
    expect(translateMapName("Ring Of Fire", "de")).toBe("Feuerring");
    expect(translateMapName("Ring Of Fire", "fr")).toBe("Cercle de feu");
    expect(translateMapName("Ring Of Fire", "it")).toBe("Ring di fuoco");
    expect(translateMapName("Ring Of Fire", "ru")).toBe("Огненное кольцо");
    expect(translateMapName("Dont Turn Around", "ko")).toBe("돌아보지 마");
    expect(translateMapName("Belles Rock", "ko")).toBe("벨의 바위");
  });

  it("uses official descriptions, abilities, and skins for catalog pages", () => {
    const fallback = "fallback description";
    expect(translateBrawlerDescription("SHELLY", fallback, "es")).not.toBe(fallback);
    expect(translateAbilityName(23000076, "SHELL SHOCK", "ja")).toBe("シェルショック");
    expect(translateSkinName(29000002, "Rockstar Colt", "en")).toBe("Rockstar Colt");
    expect(translateSkinName(29000002, "Rockstar Colt", "ru")).toBe("Рок-Звезда Кольт");
  });

  it("uses official gear names in every supported locale", () => {
    expect(translateGearName(62000000, "SPEED", "ko")).toBe("속도");
    expect(translateGearName(62000000, "SPEED", "en")).toBe("Speed");
    expect(translateGearName(62000000, "SPEED", "ja")).toBe("スピード");
    expect(translateGearName(62000000, "SPEED", "pt-br")).toBe("Velocidade");
    expect(translateGearName(62000000, "SPEED", "es")).toBe("Velocidad");
    expect(translateGearName(62000000, "SPEED", "tr")).toBe("Hız");
    expect(translateGearName(62000000, "SPEED", "de")).toBe("Tempo");
    expect(translateGearName(62000000, "SPEED", "fr")).toBe("Vitesse");
    expect(translateGearName(62000000, "SPEED", "it")).toBe("Velocità");
    expect(translateGearName(62000000, "SPEED", "ru")).toBe("Скорость");
    expect(translateGearName(62000017, "GADGET COOLDOWN", "es")).toBe("Tiempo de carga del gadget");
  });
});
