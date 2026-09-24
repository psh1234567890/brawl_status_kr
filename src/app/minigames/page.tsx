import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { loadHubCounts } from "../../server/minigames";
import { miniGames } from "../../utils/minigames/registry";
import { getBlockedCopy } from "../../i18n/minigames/blockedGameMessages";

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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={copy.hubTitle}>
        {miniGames.map((game) => {
          const cardCopy = copy.games[game.id];
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
            <article key={game.id} aria-labelledby={`mini-game-${game.id}-title`} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 id={`mini-game-${game.id}-title`} className="text-xl font-black text-slate-950">{cardCopy.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{cardCopy.description}</p>
                {countText ? <p className="mt-3 text-xs font-bold text-blue-700">{countText}</p> : null}
                {blockedCopy ? <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{blockedCopy.reason}</p> : null}
              </div>
              {game.enabled ? (
                <Link href={localizedHref(locale, game.href)} className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{copy.startGame}</Link>
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
