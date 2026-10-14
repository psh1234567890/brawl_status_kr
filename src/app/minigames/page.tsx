import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { loadHubCounts } from "../../server/minigames";
import { miniGames } from "../../utils/minigames/registry";
import { getBlockedCopy } from "../../i18n/minigames/blockedGameMessages";
import AccountBestPreview from "../../components/minigames/AccountBestPreview";
import { BrandArrow, BrandCharacter } from "../../components/brand/BrandArt";
import styles from "../../components/brand/brand.module.css";

const gameArt = {
  "brawler-quiz": [16000005, "purple"], "silhouette-quiz": [16000023, "yellow"],
  "higher-lower": [16000002, "green"], "map-quiz": [16000008, "coral"],
  "ability-quiz": [16000006, "lilac"], "release-order": [16000000, "blue"],
} as const;

export const revalidate = 3600;

const koCopy = getMinigameMessages("ko");
export const metadata: Metadata = {
  title: koCopy.hubTitle,
  description: koCopy.hubMetaDescription,
  alternates: { canonical: "/minigames", languages: localeAlternates("/minigames") },
};

export default function MiniGamesPage() {
  return <MiniGamesContent locale="ko" />;
}

export async function MiniGamesContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
  const counts = await loadHubCounts();

  return (
    <PortalLayout locale={locale} eyebrow={copy.nav} title={copy.hubTitle} description={copy.hubDescription}>
      <AccountBestPreview locale={locale} />
      <section className={styles.allGames} aria-label={copy.hubTitle}>
        {miniGames.map((game) => {
          const cardCopy = copy.games[game.id];
          const [model, color] = gameArt[game.id];
          const blockedCopy = !game.enabled && (game.id === "higher-lower" || game.id === "release-order")
            ? getBlockedCopy(locale, game.id)
            : null;
          const countText = game.id === "brawler-quiz" && counts.releasedBrawlers > 0
            ? copy.totalBrawlers.replace("{count}", counts.releasedBrawlers.toLocaleString(locale === "pt-br" ? "pt-BR" : locale))
            : game.id === "silhouette-quiz" && counts.silhouetteModels > 0
              ? copy.silhouette.pool.replace("{count}", counts.silhouetteModels.toLocaleString(locale === "pt-br" ? "pt-BR" : locale))
              : game.id === "map-quiz" || game.id === "ability-quiz"
                ? copy.round.tenQuestions
                : null;
          return (
            <article key={game.id} aria-labelledby={`mini-game-${game.id}-title`} className={styles.gameCard}>
              <div className={`${styles.gameArt} ${styles[color]}`}><BrandCharacter id={model} silhouette={game.id === "silhouette-quiz"} />{game.id === "silhouette-quiz" && <span className={styles.questionArt} aria-hidden="true">?</span>}{game.id === "higher-lower" && <span className={styles.vsArt} aria-hidden="true">VS</span>}</div>
              <div className={styles.liveGameInfo}>
                <h2 id={`mini-game-${game.id}-title`}>{cardCopy.title}</h2>
                <p>{cardCopy.description}</p>
                {countText ? <p className="mt-3 text-xs font-bold text-blue-700">{countText}</p> : null}
                {blockedCopy ? <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{blockedCopy.reason}</p> : null}
              </div>
              {game.enabled ? (
                <Link href={localizedHref(locale, game.href)} className={styles.liveGameStart} aria-label={`${cardCopy.title} · ${copy.startGame}`}>{copy.startGame}<BrandArrow /></Link>
              ) : (
                <span className="mt-5 inline-flex min-h-8 w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{copy.blocked.pending}</span>
              )}
            </article>
          );
        })}
      </section>
    </PortalLayout>
  );
}
