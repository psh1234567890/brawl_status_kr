import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { miniGames, type MiniGameId } from "./registry";

export function getMiniGameMetadata(locale: Locale, id: MiniGameId) {
  const game = miniGames.find((entry) => entry.id === id)!;
  const copy = getMinigameMessages(locale).games[id];
  const canonical = localizedHref(locale, game.href);
  if (!game.enabled) {
    return {
      title: copy.title,
      description: copy.metaDescription,
      // Next's Metadata type represents an intentionally empty language map as {}.
      // The empty child map clears the root layout's inherited language links.
      alternates: { canonical, languages: {} },
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    };
  }
  return {
    title: copy.title + " | Brawl Stars Mini Games",
    description: copy.metaDescription,
    alternates: { canonical, languages: localeAlternates(game.href) },
  };
}
