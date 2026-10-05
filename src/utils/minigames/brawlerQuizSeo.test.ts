import { describe, expect, it } from "vitest";
import { locales, localizedHref, numberLocales } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { brawlerQuizGuideMessages } from "../../i18n/minigames/brawlerQuizGuideMessages";
import { getBrawlerQuizStructuredData } from "./brawlerQuizSeo";

describe("brawler quiz search content", () => {
  it("describes the actual free game with locale-specific canonical identities and breadcrumbs", () => {
    for (const locale of locales) {
      const copy = getMinigameMessages(locale);
      const data = getBrawlerQuizStructuredData(locale);
      const [page, game, breadcrumb] = data["@graph"];
      const url = "https://www.brawl-o1.site" + localizedHref(locale, "/minigames/brawler-quiz");
      expect(page).toMatchObject({ "@type": "WebPage", url, name: copy.quizTitle, inLanguage: numberLocales[locale], mainEntity: { "@id": url + "#game" } });
      expect(game).toMatchObject({ "@type": "WebApplication", "@id": url + "#game", url, name: copy.quizTitle, description: copy.quizDescription, isAccessibleForFree: true });
      expect(breadcrumb).toMatchObject({ "@type": "BreadcrumbList", itemListElement: [
        { position: 1, item: "https://www.brawl-o1.site" + localizedHref(locale, "/") },
        { position: 2, item: "https://www.brawl-o1.site" + localizedHref(locale, "/minigames") },
        { position: 3, item: url, name: copy.quizTitle },
      ] });
      // Do not invent ratings, reviews or competitive results to attract rich results.
      expect(JSON.stringify(data)).not.toMatch(/aggregateRating|review|highScore/);
    }
  });

  it("provides explicit, nonempty guide copy in every locale without English fallback", () => {
    const keys = Object.keys(brawlerQuizGuideMessages.ko).sort();
    for (const locale of locales) {
      const guide = brawlerQuizGuideMessages[locale];
      expect(Object.keys(guide).sort(), locale).toEqual(keys);
      for (const value of Object.values(guide)) expect(value.trim().length, locale).toBeGreaterThan(0);
      if (locale !== "en") expect(guide.rules).not.toBe(brawlerQuizGuideMessages.en.rules);
    }
  });
});
