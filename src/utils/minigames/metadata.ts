import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { brawlerQuizGuideMessages } from "../../i18n/minigames/brawlerQuizGuideMessages";
import { getLocalizedSiteSeo } from "../../i18n/seo";
import { brawlerQuizSocialImage } from "./brawlerQuizSeo";
import { miniGames, type MiniGameId } from "./registry";

export function getMiniGameMetadata(locale: Locale, id: MiniGameId) {
  const game = miniGames.find((entry) => entry.id === id)!;
  const messages = getMinigameMessages(locale);
  const copy = messages.games[id];
  const canonical = localizedHref(locale, game.href);
  if (!game.enabled) {
    const socialTitle = copy.title + " | Brawl Status KR";
    return {
      title: copy.title,
      description: copy.metaDescription,
      // Next's Metadata type represents an intentionally empty language map as {}.
      // The empty child map clears the root layout's inherited language links.
      alternates: { canonical, languages: {} },
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
      openGraph: {
        title: socialTitle,
        description: copy.metaDescription,
        url: canonical,
        type: "website" as const,
      },
      twitter: {
        card: "summary" as const,
        title: socialTitle,
        description: copy.metaDescription,
      },
    };
  }
  const isBrawlerQuiz = id === "brawler-quiz";
  const pageTitle = copy.title + " | " + (isBrawlerQuiz ? brawlerQuizGuideMessages[locale].searchLabel : messages.hubTitle);
  const socialTitle = pageTitle + " | Brawl Status KR";
  const socialImage = isBrawlerQuiz
    ? [{ url: brawlerQuizSocialImage, width: 1200, height: 630, alt: copy.title }]
    : undefined;
  return {
    title: pageTitle,
    description: copy.metaDescription,
    alternates: { canonical, languages: localeAlternates(game.href) },
    openGraph: {
      title: socialTitle,
      description: copy.metaDescription,
      url: canonical,
      siteName: "Brawl Status KR",
      locale: locale === "ko" ? "ko_KR" : getLocalizedSiteSeo(locale).openGraphLocale,
      type: "website" as const,
      ...(socialImage ? { images: socialImage } : {}),
    },
    twitter: {
      card: isBrawlerQuiz ? "summary_large_image" as const : "summary" as const,
      title: socialTitle,
      description: copy.metaDescription,
      ...(socialImage ? { images: socialImage } : {}),
    },
  };
}
