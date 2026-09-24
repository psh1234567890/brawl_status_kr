import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../../components/PortalLayout";
import SilhouetteQuiz from "../../../components/minigames/SilhouetteQuiz";
import { localizedHref, type Locale } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";
import { loadSilhouetteBrawlers } from "../../../server/minigames";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";

export const revalidate = 3600;
export const metadata: Metadata = getMiniGameMetadata("ko", "silhouette-quiz");

export default function Page() { return <SilhouetteQuizContent locale="ko" />; }

export async function SilhouetteQuizContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
  const entries = await loadSilhouetteBrawlers(locale);
  return (
    <PortalLayout locale={locale} eyebrow={copy.nav} title={copy.silhouette.title} description={copy.silhouette.description} actions={
      <Link href={localizedHref(locale, "/minigames")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.backToHub}</Link>
    }>
      <SilhouetteQuiz key={locale} locale={locale} entries={entries} />
    </PortalLayout>
  );
}
