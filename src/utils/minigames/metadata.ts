import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
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
  const pageTitle = copy.title + " | " + messages.hubTitle;
  const socialTitle = pageTitle + " | Brawl Status KR";
  return {
    title: pageTitle,
    description: copy.metaDescription,
    alternates: { canonical, languages: localeAlternates(game.href) },
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
