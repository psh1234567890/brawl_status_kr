import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { getBrawlifyBrawlers } from "../../server/brawlify";
import { miniGames } from "../../utils/minigames/registry";
import { selectIndexableBrawlers } from "../../utils/seoIndexing";

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
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;
  const total = selectIndexableBrawlers(brawlers).length;

  return (
    <PortalLayout locale={locale} eyebrow={copy.nav} title={copy.hubTitle} description={copy.hubDescription}>
      <section className="grid gap-3 sm:grid-cols-2" aria-label={copy.hubTitle}>
        {miniGames.filter((game) => game.enabled).map((game) => (
          <article key={game.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-950">{copy[game.titleKey]}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{copy[game.descriptionKey]}</p>
              {game.stat === "releasedBrawlers" && total > 0 ? <p className="mt-3 text-xs font-bold text-blue-700">{copy.totalBrawlers.replace("{count}", String(total))}</p> : null}
            </div>
            <Link
              href={localizedHref(locale, game.href)}
              className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {copy.startGame}
            </Link>
          </article>
        ))}
      </section>
    </PortalLayout>
  );
}
