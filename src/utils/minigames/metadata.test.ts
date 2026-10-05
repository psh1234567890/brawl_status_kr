import { describe, expect, it } from "vitest";
import { getMiniGameMetadata } from "./metadata";
import { locales, localizedHref } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { brawlerQuizGuideMessages } from "../../i18n/minigames/brawlerQuizGuideMessages";

describe("mini game metadata", () => {
  it("uses the renamed quiz and localized search/social metadata in all ten languages", () => {
    expect(getMinigameMessages("ko").quizTitle).toBe("나는 브롤러 종류를 100가지 이상 알고있다");
    for (const locale of locales) {
      const copy = getMinigameMessages(locale);
      const metadata = getMiniGameMetadata(locale, "brawler-quiz");
      expect(metadata.title).toBe(copy.quizTitle + " | " + brawlerQuizGuideMessages[locale].searchLabel);
      expect(metadata.description).toBe(copy.quizMetaDescription);
      expect(metadata.alternates.canonical).toBe(localizedHref(locale, "/minigames/brawler-quiz"));
      expect(Object.keys(metadata.alternates.languages!)).toHaveLength(10);
      expect(metadata.openGraph).toMatchObject({
        title: metadata.title + " | Brawl Status KR",
        description: copy.quizMetaDescription,
        images: [{ url: "/images/minigames/brawler-quiz-100.png", width: 1200, height: 630, alt: copy.quizTitle }],
      });
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: metadata.openGraph.title });
    }
  });

  it("sets localized canonical and hreflang metadata for enabled pages", () => {
    const metadata = getMiniGameMetadata("en", "map-quiz");
    expect(metadata.title).toBe("Map Name Quiz | Brawl Stars Mini Games");
    expect(metadata.alternates.canonical).toBe("/en/minigames/map-quiz");
    expect(metadata.alternates.languages).toMatchObject({ "ko-KR": "/minigames/map-quiz", en: "/en/minigames/map-quiz" });
    expect(metadata.description).toContain("10");
    expect(metadata.openGraph).toMatchObject({
      title: "Map Name Quiz | Brawl Stars Mini Games | Brawl Status KR",
      url: "/en/minigames/map-quiz",
    });
    expect(metadata.twitter).toMatchObject({
      title: "Map Name Quiz | Brawl Stars Mini Games | Brawl Status KR",
    });
  });

  it("uses the localized Mini Games hub title instead of an English suffix", () => {
    const metadata = getMiniGameMetadata("ja", "map-quiz");
    expect(metadata.title).toBe("マップ名クイズ | ブロスタ ミニゲーム");
    expect(metadata.openGraph).toMatchObject({
      title: "マップ名クイズ | ブロスタ ミニゲーム | Brawl Status KR",
    });
  });

  it("marks unavailable routes noindex and omits hreflang", () => {
    const metadata = getMiniGameMetadata("ko", "higher-lower");
    expect(metadata.title).toBe("하이어 오어 로어");
    expect(metadata.robots).toMatchObject({ index: false, follow: true, googleBot: { index: false, follow: true } });
    expect(metadata.alternates.languages).toEqual({});
    expect(metadata.openGraph).toMatchObject({
      title: "하이어 오어 로어 | Brawl Status KR",
      url: "/minigames/higher-lower",
    });
    expect(metadata.twitter).toMatchObject({
      title: "하이어 오어 로어 | Brawl Status KR",
    });
  });
});
