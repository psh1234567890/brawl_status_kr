import type { Metadata } from "next";
import Link from "next/link";
import BrawlerNameQuiz from "../../../components/minigames/BrawlerNameQuiz";
import PortalLayout from "../../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";
import { getBrawlifyBrawlers } from "../../../server/brawlify";
import { translateBrawlerName } from "../../../utils/brawlTranslations";
import { selectIndexableBrawlers } from "../../../utils/seoIndexing";

export const revalidate = 3600;

const koCopy = getMinigameMessages("ko");
export const metadata: Metadata = {
  title: `${koCopy.quizTitle} | 브롤스타즈 미니게임`,
  description: koCopy.quizMetaDescription,
  alternates: { canonical: "/minigames/brawler-quiz", languages: localeAlternates("/minigames/brawler-quiz") },
};

export default function BrawlerQuizPage() {
  return <BrawlerQuizContent locale="ko" />;
}

export async function BrawlerQuizContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;
  const quizBrawlers = selectIndexableBrawlers(brawlers).map((brawler) => ({
    id: brawler.id,
    rawName: brawler.name,
    displayName: translateBrawlerName(brawler.name, locale),
    imageUrl: brawler.imageUrl2 ?? brawler.imageUrl ?? "",
  }));

  return (
    <PortalLayout
      locale={locale}
      eyebrow="MINI GAMES"
      title={copy.quizTitle}
      description={copy.quizDescription}
      actions={
        <Link href={localizedHref(locale, "/minigames")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
          {copy.backToHub}
        </Link>
      }
    >
      <BrawlerNameQuiz key={locale} locale={locale} brawlers={quizBrawlers} />
    </PortalLayout>
  );
}
