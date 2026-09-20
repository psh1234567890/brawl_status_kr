import { describe, expect, it } from "vitest";
import {
  translateBrawlerName,
  translateMapName,
  translateModeName,
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
});
