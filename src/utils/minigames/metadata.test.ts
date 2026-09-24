import { describe, expect, it } from "vitest";
import { getMiniGameMetadata } from "./metadata";

describe("mini game metadata", () => {
  it("sets localized canonical and hreflang metadata for enabled pages", () => {
    const metadata = getMiniGameMetadata("en", "map-quiz");
    expect(metadata.title).toBe("Map Name Quiz | Brawl Stars Mini Games");
    expect(metadata.alternates.canonical).toBe("/en/minigames/map-quiz");
    expect(metadata.alternates.languages).toMatchObject({ "ko-KR": "/minigames/map-quiz", en: "/en/minigames/map-quiz" });
    expect(metadata.description).toContain("10");
  });

  it("marks unavailable routes noindex and omits hreflang", () => {
    const metadata = getMiniGameMetadata("ko", "higher-lower");
    expect(metadata.title).toBe("하이어 오어 로어");
    expect(metadata.robots).toMatchObject({ index: false, follow: true, googleBot: { index: false, follow: true } });
    expect(metadata.alternates.languages).toEqual({});
  });
});
