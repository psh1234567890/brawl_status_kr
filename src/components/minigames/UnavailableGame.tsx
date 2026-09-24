import Link from "next/link";
import PortalLayout from "../PortalLayout";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { getBlockedCopy } from "../../i18n/minigames/blockedGameMessages";
import type { MiniGameId } from "../../utils/minigames/registry";

export default function UnavailableGame({ locale, id }: {
  locale: Locale;
  id: Extract<MiniGameId, "higher-lower" | "release-order">;
}) {
  const common = getMinigameMessages(locale);
  const game = getBlockedCopy(locale, id);
  return (
    <PortalLayout locale={locale} title={game.title} description={game.description}>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="pending-game-title">
        <h2 id="pending-game-title" className="text-lg font-black text-slate-950">{common.blocked.pending}</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{game.reason}</p>
        <Link href={localizedHref(locale, "/minigames")} className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{common.backToHub}</Link>
      </section>
    </PortalLayout>
  );
}
