import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../../components/PortalLayout";
import MapNameQuiz from "../../../components/minigames/MapNameQuiz";
import { localizedHref, type Locale } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";
import { loadMapQuizEntries } from "../../../server/minigames";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";

export const revalidate = 3600;
export const metadata: Metadata = getMiniGameMetadata("ko", "map-quiz");

export default function Page() { return <MapNameQuizContent locale="ko" />; }

export async function MapNameQuizContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
  const maps = await loadMapQuizEntries(locale);
  return (
    <PortalLayout locale={locale} eyebrow={copy.nav} title={copy.mapQuiz.title} description={copy.mapQuiz.description} actions={
      <Link href={localizedHref(locale, "/minigames")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.backToHub}</Link>
    }>
      <MapNameQuiz key={locale} locale={locale} maps={maps} />
    </PortalLayout>
  );
}
